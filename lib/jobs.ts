// Types, filters and prompts for the live job openings attached to a paid
// Glow-Up. Full design + the live testing that shaped it: docs/jobs-feed-spec.md
//
// The one rule everything here enforces: we only show a job we can stand behind.
// A paid feature that surfaces an Instagram reel, a job-board category page, or
// another candidate's "open to work" post is worse than showing nothing — it
// reads as the product being broken, and it generates refunds. So the filters
// below are aggressive and drop-by-default: anything we can't confirm is a real,
// dated, applyable posting doesn't make the cut.

export type JobSource = "jsearch" | "adzuna";
export type VerifyStatus = "live" | "closed" | "unverifiable";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  postedAt: string; // ISO — ALWAYS source-provided, never inferred
  applyUrl: string;
  source: JobSource;
  via: string; // "LinkedIn", "Naukri", "company site"
  verifiable: boolean; // false → we can never check this one (see BLOCKED_VERIFY)
  matchReason: string; // one line from the ranking pass
  salary?: string;
  snippet?: string; // short JD excerpt, used for ranking then trimmed
}

export type DegradeReason = "quota" | "no_results" | "disabled" | "not_configured";

export interface JobsPayload {
  jobs: Job[];
  degraded?: DegradeReason;
  fetchedAt: string;
  broadened?: boolean; // we widened the search to fill the list — say so in the UI
}

export interface JobIntent {
  role: string;
  seniority: string;
  stack: string[];
  location: string;
  remoteOk: boolean;
  years: number;
}

export const MAX_JOBS = 5;
export const FRESH_DAYS = 7;
export const BROADEN_DAYS = 30;
export const JOB_SNIPPET_CAP = 260;

// Domains that are never a real job posting. The live search testing that
// killed Firecrawl-as-discovery returned two Instagram reels, a Facebook group
// post and a job seeker's own "open to work" ad in a single ten-result page
// (spec §2.1). The aggregator APIs are far cleaner, but this stays as defence
// in depth — a social link in a paid list is the single most damaging failure.
const JUNK_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "threads.net",
  "twitter.com",
  "x.com",
  "t.me",
  "telegram.me",
  "whatsapp.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "pinterest.com",
  "reddit.com",
  "quora.com",
  "medium.com",
  "substack.com",
  // Content farms that republish scraped listings under their own name. Seen
  // live as "flexboard.9y.liveblog365.com/job/2564595" with employer "FlexBoard"
  // — a blogging host, not a job board, and the postings are unapplyable.
  "liveblog365.com",
];

// Firecrawl declines these outright ("we do not support this site") — see spec
// §2.2. Jobs from here are still shown, but flagged unverifiable so the UI can
// hedge honestly instead of implying we checked something we can't.
const BLOCKED_VERIFY = ["linkedin.com", "lnkd.in", "glassdoor.com", "indeed.com"];

// Job feeds carry HTML-escaped text. Seen live: "Senior Backend Engineer &#8211;
// Media Delivery". React escapes on output, so an undecoded entity renders as
// literal "&#8211;" in a paid report.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostMatches(h: string, list: string[]): boolean {
  return list.some((d) => h === d || h.endsWith("." + d));
}

export function isJunkUrl(url: string): boolean {
  const h = host(url);
  if (!h) return true;
  if (hostMatches(h, JUNK_HOSTS)) return true;

  // Category / listing pages rather than a single posting. The Naukri result in
  // testing was `naukri.com/front-end-developer-jobs` — a browse page whose own
  // body said "3+ weeks ago" while passing a past-week filter. Applying to it is
  // impossible; it's a search result, not a job.
  let path = "";
  try {
    path = new URL(url).pathname.replace(/\/+$/, "");
  } catch {
    return true;
  }
  if (!path || path === "") return true;
  // Listing slugs end in "-jobs", sometimes with a short board-specific suffix
  // ("…-senior-node-js-developer-jobs-prf" on AmbitionBox). Real postings end in
  // an id or a title slug, so this doesn't catch them.
  if (/-jobs(-[a-z0-9]{1,8})?$/.test(path)) return true;
  if (/\/jobs$/.test(path)) return true;
  if (/^\/(jobs|search|browse|listings)$/.test(path)) return true;
  return false;
}

// Aggregators sometimes return their own browse page as a "job", with the board
// as the employer and a search phrase as the title ("Full Stack Engineer Jobs in
// Bangalore | React…" listed under employer "JobItUs"). The URL heuristics miss
// these because the path looks like a normal deep link, so catch the title.
const LISTING_TITLE_RE = /\bjobs?\s+in\s+\w|\bjob\s+vacanc|\bjobs?\s*[-–|]\s*(apply|search|browse)\b|^\s*(latest|top|best)\s+\w+\s+jobs?\b/i;

// Scraper placeholders where the real employer was stripped out. Live JSearch
// results for an unlocated search returned four of these in one page:
// "reputed company DevOps Engineer – Build, Rel…", "Team reputed company -
// reputed company DevOps…". Nobody can evaluate, or apply to, a job at
// "reputed company" — these are noise wearing a job title.
const REDACTED_TITLE_RE = /\breputed company\b|\bconfidential company\b|\bcompany name (withheld|confidential)\b|\bclient of\b.*\bconfidential\b/i;

export function looksLikeListing(title: string): boolean {
  return LISTING_TITLE_RE.test(title) || REDACTED_TITLE_RE.test(title);
}

// Placeholder EMPLOYER names, which are a separate problem from placeholder
// titles. Seen across the 20-résumé sweep: "Nameless", "Important Group",
// "Important Business". The worst case shipped a card reading company
// "Nameless" while its own match reason said "Embedded Linux role at Bosch" —
// the real employer was in the description all along and the feed's employer
// field was junk. A card that names the wrong company is unusable: the user
// can't research it, and it reads as a broken product.
// Anchored end-to-end on purpose. An earlier unanchored version rejected
// "Important Business Solutions Pvt Ltd" — a perfectly plausible real company —
// while trying to catch the placeholder "Important Business". Only the bare
// placeholder should ever match.
const PLACEHOLDER_COMPANY_RE =
  /^(nameless|unknown|n\/?a|none|undisclosed|confidential|private|company|employer|recruiter|client|important\s+(group|business|compan(y|ies)|firm|client)|(reputed|confidential|leading|renowned)\s+compan(y|ies))$/i;

export function looksLikePlaceholderCompany(company: string): boolean {
  return PLACEHOLDER_COMPANY_RE.test(company.trim());
}

// Hostname of the page we'd send the user to, used to stop one publisher owning
// the whole list (see capPerPublisher).
export function applyHost(url: string): string {
  return host(url);
}

// One content farm should never fill the column. The sparse-résumé case in the
// sweep returned 4 of 4 postings from a single publisher (mysmartpros.co) —
// technically distinct jobs, but a list with one source behind every row gives
// the user no way to cross-check and looks like an ad.
export function capPerPublisher(jobs: Job[], max = 3): Job[] {
  const seen = new Map<string, number>();
  const out: Job[] = [];
  for (const j of jobs) {
    const h = host(j.applyUrl) || j.via;
    const n = seen.get(h) ?? 0;
    if (n >= max) continue;
    seen.set(h, n + 1);
    out.push(j);
  }
  return out;
}

export function canVerify(url: string): boolean {
  const h = host(url);
  return !!h && !hostMatches(h, BLOCKED_VERIFY);
}

// Where the posting actually lives, for the "via X" label.
export function viaLabel(url: string): string {
  const h = host(url);
  if (!h) return "job board";
  const named: Record<string, string> = {
    "linkedin.com": "LinkedIn",
    "lnkd.in": "LinkedIn",
    "naukri.com": "Naukri",
    "indeed.com": "Indeed",
    "shine.com": "Shine",
    "foundit.in": "Foundit",
    "glassdoor.com": "Glassdoor",
    "monster.com": "Monster",
    "ambitionbox.com": "AmbitionBox",
    "wellfound.com": "Wellfound",
    "instahyre.com": "Instahyre",
    "cutshort.io": "Cutshort",
  };
  for (const [d, label] of Object.entries(named)) {
    if (h === d || h.endsWith("." + d)) return label;
  }
  if (/myworkdayjobs\.com$/.test(h)) return "company site";
  if (/(greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com)$/.test(h)) {
    return "company site";
  }
  return h;
}

// A posted date we can defend. Source-provided or nothing — never inferred from
// crawl dates, never "assume today". A job we can't date gets dropped, because
// "posted 2 days ago" is a factual claim the user makes decisions on.
export function parsePosted(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Some sources send unix seconds, some milliseconds.
    const ms = raw > 1e12 ? raw : raw * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function withinDays(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const age = Date.now() - t;
  // Reject dates more than a day in the future — that's bad source data, and a
  // "posted tomorrow" badge destroys trust in every other date on the page.
  if (age < -86_400_000) return false;
  return age <= days * 86_400_000;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Same role at the same company in the same city, cross-posted to four boards,
// is one job. Keep the copy we can verify; break ties on the earlier URL.
export function dedupe(jobs: Job[]): Job[] {
  const seen = new Map<string, Job>();
  for (const j of jobs) {
    const key = `${norm(j.company)}|${norm(j.title)}|${norm(j.location)}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, j);
      continue;
    }
    // Prefer a verifiable posting over an unverifiable duplicate.
    if (!prev.verifiable && j.verifiable) seen.set(key, j);
  }
  return [...seen.values()];
}

// The hard gate every job passes before a user ever sees it.
export function usable(j: Job, days: number): boolean {
  if (!j.title.trim() || !j.company.trim()) return false;
  if (looksLikeListing(j.title)) return false;
  if (looksLikePlaceholderCompany(j.company)) return false;
  if (!j.applyUrl || isJunkUrl(j.applyUrl)) return false;
  if (!j.postedAt || !withinDays(j.postedAt, days)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Prompts. Both run on Haiku: these are structured-extraction and scoring jobs
// over already-parsed data, not prose, so the Sonnet premium buys nothing here.
// ---------------------------------------------------------------------------

export function buildIntentPrompt(targetRole: string): string {
  const role = targetRole.trim().slice(0, 120);
  return `Read this résumé and produce the search terms for finding this person a job.
${role ? `The user says they are applying for: "${role}". Trust this over the résumé's current title.\n` : ""}
Respond with ONLY minified JSON — no prose, no markdown fences:
{"role":"the job title to search, as a job board would phrase it","seniority":"junior|mid|senior|lead|principal","stack":["the 3-6 technologies most worth matching on"],"location":"the city or region to search, from the résumé's most recent location","remoteOk":true,"years":4}

RULES:
- "role" must be a real, searchable job title ("Frontend Engineer", not "Ninja Rockstar Coder" and not a whole sentence).
- "location" — the city only ("Bangalore", "Pune", "London"). If the résumé shows no location, use "".
- "years" — total professional years, integer, 0 if unclear.
- Work only from the text. Do not invent a stack the résumé never mentions.`;
}

export function buildRankPrompt(
  intent: JobIntent,
  count: number,
  broadened = false,
): string {
  // The candidate's city belongs in the header. Without it the model judged
  // "location fit" by guessing from the résumé body, and on a broadened search
  // it claimed a Mumbai posting was "in Jaipur matching exact location". Every
  // location claim needs both sides stated explicitly.
  const where = intent.location || "not stated on the résumé";
  return `You are matching a candidate to real job openings. You will be given their résumé and a numbered list of live postings.

CANDIDATE: ${intent.role || "unknown role"} · ${intent.seniority || "unknown"} · ~${intent.years} yrs · stack: ${intent.stack.join(", ") || "unknown"}
CANDIDATE LOCATION: ${where}
${
  broadened
    ? "NOTE: too little matched near them, so this search was widened across the country and by date. Expect postings in other cities and older postings. Do not present a posting in another city as a local match — name the city and let them decide.\n"
    : ""
}
Pick the ${count} best matches, ordered best first. Judge on: title fit, seniority fit (a 3-year candidate is wrong for a Principal role and wasting their time), stack overlap, and location fit.

Respond with ONLY minified JSON — no prose, no markdown fences:
{"picks":[{"id":"the id exactly as given","why":"one specific sentence on why THIS posting fits THIS résumé"}]}

RULES:
- Use only ids from the list. Never invent a posting.
- "why" must reference something concrete — a shared technology, a matching seniority, a domain they've worked in. No generic filler like "a great opportunity for growth".
- If fewer than ${count} postings are genuinely a reasonable fit, return fewer. A short honest list beats padding with roles they'd be rejected from.
- EXCLUDE any posting that is the wrong KIND of work, however well the keywords line up. Teaching or training a subject is not practising it; a trainer, faculty, tutor, coach or "academy" role is not a match for a practitioner. So is a sales or pre-sales role for a builder, or an internship for someone with years of experience. Leaving it out is right — never include one and explain in "why" that it's a poor fit.
- A weak-but-plausible fit is fine to include with an honest caveat ("closest match, though it leans more X than your background"). The line is: same kind of job, different emphasis → keep; different kind of job → drop.

INTEGRITY — non-negotiable. The user acts on this text; a claim that isn't true wastes a real application.
- NEVER assert a match that isn't in BOTH the posting and the résumé. Do not claim a technology overlaps unless it appears on both sides.
- LOCATION is the easiest thing to get wrong and the most expensive: a wrong city sends someone after a job they cannot take. Use the posting's own location field, never the city named in the CANDIDATE LOCATION line above. Only call it a location match when the two genuinely agree. If they differ, say which city the job is in ("this one is in Mumbai"). If the posting says only "India", "Anywhere" or "Remote", describe it that way — never as their city.
- Never repeat a company placeholder as if it were a real employer. If a posting says "reputed company", "confidential", or similar, do not name it in "why" — describe the ROLE instead.
- If a posting is the best available but a weak fit, say so plainly in "why". An honest "closest match, though it leans more X than your background" is worth more than an invented alignment.`;
}

// Scraper placeholders leak into descriptions as well as titles, and the model
// will happily echo them into user-facing copy ("Remote backend role at reputed
// company"). Strip them before ranking so there's nothing to repeat.
const PLACEHOLDER_RE = /\b(reputed|confidential|leading|renowned)\s+compan(y|ies)\b/gi;

// Compact list for the ranking call — enough to judge on, small enough to stay
// cheap. The full record never goes to the model.
export function jobsForRanking(jobs: Job[]): string {
  return jobs
    .map((j) => {
      const bits = [
        `id:${j.id}`,
        j.title,
        `@ ${j.company}`,
        j.location || "location n/a",
        j.remote ? "remote" : "",
        j.salary ? `pay: ${j.salary}` : "",
      ].filter(Boolean);
      const head = bits.join(" · ");
      const clean = (j.snippet ?? "").replace(PLACEHOLDER_RE, "the employer");
      const snip = clean ? `\n  ${clean.slice(0, JOB_SNIPPET_CAP)}` : "";
      return `- ${head}${snip}`;
    })
    .join("\n");
}

// Cities the ranker might name in a match reason. Weighted to India because
// that's the user base; a handful of international ones for the rest.
const KNOWN_CITIES = [
  "bangalore", "bengaluru", "mumbai", "delhi", "new delhi", "noida", "gurgaon",
  "gurugram", "pune", "hyderabad", "chennai", "kolkata", "ahmedabad", "kochi",
  "ernakulam", "jaipur", "indore", "coimbatore", "chandigarh", "trivandrum",
  "thiruvananthapuram", "mysore", "mysuru", "nagpur", "bhubaneswar", "vizag",
  "visakhapatnam", "surat", "lucknow", "vadodara", "goa", "mohali",
  "london", "manchester", "new york", "san francisco", "seattle", "austin",
  "berlin", "singapore", "dubai", "toronto", "sydney",
];

// Indian cities that renamed. A posting listed in "Bengaluru, Karnataka" fully
// supports a reason that says "Bangalore" — treating them as different cities
// would strip a true statement.
const CITY_ALIASES: string[][] = [
  ["bangalore", "bengaluru"],
  ["gurgaon", "gurugram"],
  ["delhi", "new delhi"],
  ["kochi", "ernakulam"],
  ["mysore", "mysuru"],
  ["vizag", "visakhapatnam"],
  ["trivandrum", "thiruvananthapuram"],
];

function cityKey(city: string): string {
  const group = CITY_ALIASES.find((g) => g.includes(city));
  return group ? group[0] : city;
}

// Prompt rules alone did not hold this line. Even with the candidate's city in
// the prompt and an explicit instruction, Haiku still produced "Data Analyst
// role in Jaipur…" for a posting whose location field read "Anywhere" — it
// leaks the candidate's city into the reason as though it were the job's.
//
// A wrong city is the most expensive error this feature can make: it sends
// someone after a job they can't take. So it's enforced in code, not left to
// the model. Any clause naming a city the posting's own location doesn't
// support is dropped; the rest of the reason survives, and the card still shows
// the true location right above it.
// The same false claim without naming a city: "local match eliminates
// relocation risk" on a Mumbai posting for a Jaipur candidate. Caught live
// immediately after the city-name rule closed the first hole.
const LOCALITY_CLAIM_RE =
  /\blocal(ly|ity)?\b|\bsame city\b|\bno relocation\b|\brelocation (risk|friction|isn'?t|not)\b|\bwithout relocat|\bnearby\b|\bcommut/i;

export function sanitizeMatchReason(
  reason: string,
  jobLocation: string,
  candidateLocation = "",
): string {
  if (!reason.trim()) return "";
  const loc = jobLocation.toLowerCase();
  // Non-specific locations ("Anywhere", "Remote", "India") support no city claim.
  const supported = new Set(KNOWN_CITIES.filter((c) => loc.includes(c)).map(cityKey));

  // Do the candidate's city and the posting's actually agree? Only then may a
  // reason talk about locality at all.
  const candKeys = new Set(
    KNOWN_CITIES.filter((c) => candidateLocation.toLowerCase().includes(c)).map(cityKey),
  );
  const sameCity =
    supported.size > 0 && candKeys.size > 0 && [...candKeys].some((k) => supported.has(k));

  const clauses = reason.split(/\s*;\s*/).filter(Boolean);
  const kept = clauses.filter((clause) => {
    const lower = clause.toLowerCase();
    if (!sameCity && LOCALITY_CLAIM_RE.test(lower)) return false;
    const named = KNOWN_CITIES.filter((c) => new RegExp(`\\b${c}\\b`).test(lower));
    if (!named.length) return true;
    // Keep the clause only if every city it names is one the posting supports.
    return named.every((c) => supported.has(cityKey(c)));
  });

  // If stripping removed everything, the whole reason was built on a bad
  // location claim and there's nothing honest left to show.
  return kept.join("; ").trim();
}

// Text signals that a posting is no longer taking applicants. Deliberately
// conservative: a false "closed" hides a real job, so anything ambiguous stays
// live and the timestamp label carries the caveat instead.
const CLOSED_RE =
  /(no longer accept|no longer available|position (has been )?filled|this (job|position|vacancy) (is |has been )?(closed|filled|expired)|applications? (are |is )?closed|posting (has )?expired|we are no longer|job not found|this job has expired)/i;

export function readsClosed(text: string): boolean {
  return CLOSED_RE.test(text);
}
