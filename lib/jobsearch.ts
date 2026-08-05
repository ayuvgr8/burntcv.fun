// Job discovery adapters. Two sources, tried in order, first success wins.
//
// JSearch (Google for Jobs) is primary because it has by far the best Indian
// coverage — it surfaces postings from LinkedIn, Indeed, Naukri mirrors and
// company career pages in one call, which matters when most of the user base is
// Indian. Adzuna is the fallback: a smaller, more Europe-weighted index, but a
// clean one with a real posted-date field and a 1,000/month free tier.
//
// Firecrawl's /search endpoint is deliberately ABSENT from this file. It was
// tested as a third fallback and rejected — see docs/jobs-feed-spec.md §2.1. It
// returned ~30% real postings, and its `tbs=qdr:w` recency filter keys on
// Google's index date rather than the posting date, so it cannot answer "posted
// in the last 7 days" at all. A bad third source is worse than two good ones.

import {
  canVerify,
  decodeEntities,
  isJunkUrl,
  parsePosted,
  viaLabel,
  type Job,
  type JobIntent,
} from "./jobs";
import { quotaAvailable, recordQuota } from "./quota";

// JSearch is slow — measured 7-11.6s per call against the live API, because
// each request fans out across Google for Jobs, and observed overshooting 20s
// under load. This is the single strongest reason the jobs lookup runs AFTER
// the Glow-Up renders instead of inside it.
//
// 30s is generous on purpose: an abort here costs the user the whole section,
// while a slow response still fits inside the route's 60s ceiling alongside the
// two Claude calls (the broaden retry is separately deadline-guarded).
const TIMEOUT_MS = Number(process.env.JOBS_TIMEOUT_MS ?? 30_000);

const JSEARCH_KEY = process.env.JSEARCH_RAPIDAPI_KEY ?? "";
const JSEARCH_HOST = process.env.JSEARCH_RAPIDAPI_HOST ?? "jsearch.p.rapidapi.com";
const ADZUNA_ID = process.env.ADZUNA_APP_ID ?? "";
const ADZUNA_KEY = process.env.ADZUNA_APP_KEY ?? "";

export const jobsConfigured = !!(JSEARCH_KEY || (ADZUNA_ID && ADZUNA_KEY));

// Adzuna is per-country and JSearch takes an ISO country code, so a free-text
// city has to resolve to one. Default is India — that's where the paying users
// and the ₹49 price point are.
const DEFAULT_COUNTRY = (process.env.JOBS_DEFAULT_COUNTRY ?? "in").toLowerCase();

const COUNTRY_HINTS: [RegExp, string][] = [
  [/\b(india|bangalore|bengaluru|mumbai|delhi|ncr|gurgaon|gurugram|noida|hyderabad|chennai|pune|kolkata|ahmedabad|kochi|jaipur|indore|chandigarh)\b/i, "in"],
  [/\b(united states|usa|u\.s\.|new york|san francisco|seattle|austin|boston|chicago|los angeles)\b/i, "us"],
  [/\b(united kingdom|uk|london|manchester|edinburgh|bristol|leeds)\b/i, "gb"],
  [/\b(canada|toronto|vancouver|montreal)\b/i, "ca"],
  [/\b(australia|sydney|melbourne|brisbane)\b/i, "au"],
  [/\b(germany|berlin|munich|hamburg)\b/i, "de"],
  [/\b(singapore)\b/i, "sg"],
  [/\b(uae|dubai|abu dhabi)\b/i, "ae"],
];

export function countryFor(location: string): string {
  const l = (location || "").trim();
  if (!l) return DEFAULT_COUNTRY;
  for (const [re, code] of COUNTRY_HINTS) if (re.test(l)) return code;
  return DEFAULT_COUNTRY;
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Country names for the query string. The `country` parameter alone does NOT
// keep results local: an unlocated "DevOps Engineer" search came back with a
// Bulgarian job board and a page of scraper spam despite country=in. Naming the
// country in the query itself is what actually anchors it.
const COUNTRY_NAMES: Record<string, string> = {
  in: "India", us: "United States", gb: "United Kingdom", ca: "Canada",
  au: "Australia", de: "Germany", sg: "Singapore", ae: "UAE",
};

// Role + location only. Stack terms are deliberately EXCLUDED, measured against
// the live API:
//
//   "Backend Engineer Node.js PostgreSQL in Pune" →  0 results
//   "Backend Engineer in Pune"                    → 10 results
//   "Data Analyst SQL Python in Hyderabad"        →  2 results
//   "Data Analyst in Hyderabad"                   → 10 results
//
// JSearch matches the query string near-literally, so every technology added
// narrows the funnel rather than sharpening it. The stack still does its job —
// one stage later, in the ranking prompt, where scoring 10 real postings by
// stack overlap beats finding none at all. Discovery broad, ranking narrow.
function queryFor(intent: JobIntent, broad: boolean): string {
  // The broadened retry drops the city — the other big constraint for tier-2
  // locations and niche titles — but never drops the country.
  const parts = [intent.role];
  const country = COUNTRY_NAMES[countryFor(intent.location)] ?? "";
  if (!broad && intent.location) parts.push(`in ${intent.location}`);
  else if (country) parts.push(`in ${country}`);
  return parts.filter(Boolean).join(" ").trim();
}

function mkId(source: string, i: number): string {
  return `${source}-${i}`;
}

// --------------------------------- JSearch ---------------------------------

interface JSearchApplyOption {
  publisher?: string;
  apply_link?: string;
  is_direct?: boolean;
}

interface JSearchJob {
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_location?: string;
  job_apply_link?: string;
  job_google_link?: string;
  apply_options?: JSearchApplyOption[];
  job_posted_at_datetime_utc?: string;
  job_posted_at_timestamp?: number;
  job_is_remote?: boolean;
  job_publisher?: string;
  job_description?: string;
  job_salary_string?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
}

// A job cross-posted to several boards comes with one apply link per board.
// Prefer one we can actually verify: an employer's own site beats LinkedIn,
// which Firecrawl refuses outright. Falls back to whatever JSearch ranked
// first, so we never drop a job just because its best link is unverifiable.
function bestApplyLink(r: JSearchJob): string {
  const options = (r.apply_options ?? [])
    .map((o) => o.apply_link ?? "")
    .filter((u) => u && !isJunkUrl(u));
  const direct = (r.apply_options ?? []).find(
    (o) => o.is_direct && o.apply_link && !isJunkUrl(o.apply_link) && canVerify(o.apply_link),
  );
  return (
    direct?.apply_link ||
    options.find((u) => canVerify(u)) ||
    options[0] ||
    (r.job_apply_link && !isJunkUrl(r.job_apply_link) ? r.job_apply_link : "")
  );
}

function salaryText(min?: number, max?: number, cur?: string): string | undefined {
  if (!min && !max) return undefined;
  const c = cur || "";
  const fmt = (n: number) => (n >= 100000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
  if (min && max) return `${c} ${fmt(min)}–${fmt(max)}`.trim();
  return `${c} ${fmt((min || max) as number)}+`.trim();
}

async function fromJSearch(intent: JobIntent, broad: boolean): Promise<Job[]> {
  if (!JSEARCH_KEY) return [];
  if (!(await quotaAvailable("jsearch"))) return [];

  // Endpoint is /search-v2 — the old /search 404s, and pagination moved from
  // page/num_pages to an opaque cursor. One page (10 results) per lookup keeps
  // us inside the 200-request free tier; the 7-day filter typically leaves
  // 5-8 of those, which is enough to rank 5 from.
  const params = new URLSearchParams({
    query: queryFor(intent, broad),
    date_posted: broad ? "month" : "week",
    country: countryFor(intent.location),
  });
  if (intent.remoteOk && !intent.location) params.set("work_from_home", "true");

  const data = (await getJson(`https://${JSEARCH_HOST}/search-v2?${params}`, {
    "x-rapidapi-key": JSEARCH_KEY,
    "x-rapidapi-host": JSEARCH_HOST,
  })) as { data?: { jobs?: JSearchJob[] } };
  await recordQuota("jsearch", 1);

  const rows = Array.isArray(data?.data?.jobs) ? data.data.jobs : [];
  return rows
    .map((r, i): Job | null => {
      // Never job_google_link — that's a Google search redirect, not an apply
      // page, and handing it to someone about to apply wastes their click.
      const url = bestApplyLink(r);
      if (!url) return null;
      const postedAt = parsePosted(r.job_posted_at_datetime_utc ?? r.job_posted_at_timestamp);
      if (!postedAt) return null;
      const loc =
        r.job_location ||
        [r.job_city, r.job_state].filter(Boolean).join(", ") ||
        r.job_country ||
        "";
      return {
        id: mkId("js", i),
        title: decodeEntities(r.job_title || ""),
        company: decodeEntities(r.employer_name || ""),
        location: decodeEntities(loc),
        remote: !!r.job_is_remote,
        postedAt,
        applyUrl: url,
        source: "jsearch",
        // The publisher JSearch names can differ from the link we picked above,
        // so label from the URL we're actually sending them to.
        via: viaLabel(url),
        verifiable: canVerify(url),
        matchReason: "",
        salary:
          r.job_salary_string?.trim() ||
          salaryText(r.job_min_salary, r.job_max_salary, r.job_salary_currency),
        snippet: (r.job_description || "").replace(/\s+/g, " ").trim().slice(0, 400),
      };
    })
    .filter((j): j is Job => !!j);
}

// --------------------------------- Adzuna ----------------------------------

interface AdzunaJob {
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  created?: string;
  redirect_url?: string;
  description?: string;
  salary_min?: number;
  salary_max?: number;
}

async function fromAdzuna(intent: JobIntent, broad: boolean): Promise<Job[]> {
  if (!ADZUNA_ID || !ADZUNA_KEY) return [];
  if (!(await quotaAvailable("adzuna"))) return [];

  const country = countryFor(intent.location);
  const params = new URLSearchParams({
    app_id: ADZUNA_ID,
    app_key: ADZUNA_KEY,
    results_per_page: "30",
    what: queryFor(intent, broad).replace(/\bin\s+\S+$/i, "").trim() || intent.role,
    max_days_old: broad ? "30" : "7",
    "content-type": "application/json",
  });
  if (intent.location) params.set("where", intent.location);

  const data = (await getJson(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  )) as { results?: AdzunaJob[] };
  await recordQuota("adzuna", 1);

  const rows = Array.isArray(data?.results) ? data.results : [];
  return rows
    .map((r, i): Job | null => {
      const url = r.redirect_url || "";
      if (!url || isJunkUrl(url)) return null;
      const postedAt = parsePosted(r.created);
      if (!postedAt) return null;
      const loc = r.location?.display_name || "";
      return {
        id: mkId("az", i),
        title: decodeEntities((r.title || "").replace(/<\/?[^>]+>/g, "")),
        company: decodeEntities(r.company?.display_name || ""),
        location: decodeEntities(loc),
        remote: /remote|work from home/i.test(`${r.title ?? ""} ${loc}`),
        postedAt,
        applyUrl: url,
        source: "adzuna",
        via: viaLabel(url),
        verifiable: canVerify(url),
        matchReason: "",
        salary: salaryText(r.salary_min, r.salary_max, country === "in" ? "₹" : ""),
        snippet: (r.description || "").replace(/<\/?[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
      };
    })
    .filter((j): j is Job => !!j);
}

// ---------------------------------------------------------------------------

// Try JSearch, fall back to Adzuna. A source that throws (down, rate-limited,
// key revoked) is skipped rather than fatal — the whole feature is a bonus
// section and must never surface an error to a user who paid for a Glow-Up.
export async function discover(intent: JobIntent, broad = false): Promise<Job[]> {
  const sources: [string, () => Promise<Job[]>][] = [
    ["jsearch", () => fromJSearch(intent, broad)],
    ["adzuna", () => fromAdzuna(intent, broad)],
  ];

  for (const [name, run] of sources) {
    try {
      const jobs = await run();
      if (jobs.length) return jobs;
    } catch (err) {
      console.error(`[jobs] ${name} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return [];
}
