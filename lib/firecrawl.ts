// Best-effort "is this posting still open?" check, via Firecrawl.
//
// Two decisions here came straight out of live testing (docs/jobs-feed-spec.md
// §2.3, §2.4) and both matter to the bill:
//
//  1. We ask for markdown, NOT Firecrawl's `json` extraction mode. JSON mode
//     costs 5 credits instead of 1 and — tested against a real Workday posting —
//     returned {"blocked":true,"note":"page is currently loading"} because the
//     LLM extractor saw an unhydrated SPA shell. The complete job description
//     was sitting in metadata.ogDescription on that same response. The cheap
//     path was both correct and 5× cheaper, so we read metadata first and fall
//     back to body markdown.
//
//  2. Firecrawl's own cache does not save money — a response with
//     cacheState:"hit" still billed creditsUsed:5. `maxAge` below is a latency
//     optimisation only; every credit saved has to be saved by OUR Redis cache.
//
// Verification is also LAZY — called when a user expands a job card, not for
// all five up front. That single choice is the difference between ~40 and
// ~2,000 reports a month on the free tier.

import { isJunkUrl, readsClosed, type VerifyStatus } from "./jobs";
import { quotaAvailable, recordQuota } from "./quota";
import { getRedis } from "./redis";

const KEY = process.env.FIRECRAWL_API_KEY ?? "";
const API = process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev/v2/scrape";
const TIMEOUT_MS = Number(process.env.FIRECRAWL_TIMEOUT_MS ?? 12_000);

// A plain markdown scrape is 1 credit. Kept as a named constant so the quota
// accounting stays honest if the request options ever change.
const CREDITS_PER_VERIFY = 1;

const redis = getRedis();
const CACHE_SECONDS = 60 * 60 * 24; // a "checked live" claim goes stale fast

export const firecrawlConfigured = !!KEY;

export interface VerifyResult {
  status: VerifyStatus;
  checkedAt: string;
}

function cacheKey(url: string): string {
  return `burntcv:jobverify:${url.slice(0, 400)}`;
}

async function cached(url: string): Promise<VerifyResult | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(cacheKey(url));
    return raw ? (JSON.parse(raw) as VerifyResult) : null;
  } catch {
    return null;
  }
}

async function store(url: string, result: VerifyResult): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(cacheKey(url), JSON.stringify(result), { ex: CACHE_SECONDS });
  } catch {
    /* cache write failures are not worth failing a verify over */
  }
}

interface ScrapeResponse {
  success?: boolean;
  error?: string;
  data?: {
    markdown?: string;
    metadata?: {
      statusCode?: number;
      description?: string;
      ogDescription?: string;
      title?: string;
      ogTitle?: string;
      sourceURL?: string; // what we asked for
      url?: string; // where we actually landed after redirects
    };
  };
}

export async function verifyJob(url: string): Promise<VerifyResult> {
  const now = () => new Date().toISOString();

  const hit = await cached(url);
  if (hit) return hit;

  if (!KEY) return { status: "unverifiable", checkedAt: now() };
  if (!(await quotaAvailable("firecrawl", CREDITS_PER_VERIFY))) {
    // Out of budget is not the same as "we checked and don't know" — but from
    // the user's side both mean the same hedge, and neither may pretend to be
    // a live check. Not cached: tomorrow's quota should get a real look.
    return { status: "unverifiable", checkedAt: now() };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let body: ScrapeResponse;
  try {
    const res = await fetch(API, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        parsers: [], // no PDF parsing — job pages are HTML and PDFs bill per page
        proxy: "basic",
        maxAge: 6 * 60 * 60 * 1000, // latency only; Firecrawl bills cache hits anyway
      }),
    });

    // Firecrawl declines some domains outright (LinkedIn: "we do not support
    // this site"). That is a permanent property of the URL, so it IS worth
    // caching — re-asking tomorrow burns a request for the same refusal.
    if (res.status === 400 || res.status === 403) {
      const out: VerifyResult = { status: "unverifiable", checkedAt: now() };
      await store(url, out);
      return out;
    }
    if (!res.ok) return { status: "unverifiable", checkedAt: now() };
    body = (await res.json()) as ScrapeResponse;
  } catch {
    return { status: "unverifiable", checkedAt: now() };
  } finally {
    clearTimeout(timer);
  }

  await recordQuota("firecrawl", CREDITS_PER_VERIFY);

  if (!body?.success || !body.data) {
    const out: VerifyResult = { status: "unverifiable", checkedAt: now() };
    if (/do not support this site/i.test(body?.error ?? "")) await store(url, out);
    return out;
  }

  const meta = body.data.metadata ?? {};
  const code = meta.statusCode ?? 200;
  if (code === 404 || code === 410) {
    const out: VerifyResult = { status: "closed", checkedAt: now() };
    await store(url, out);
    return out;
  }
  if (code >= 400) return { status: "unverifiable", checkedAt: now() };

  // Expired postings frequently do NOT 404. Verified against a dead Shine URL:
  // it 302s to https://www.shine.com/ and returns HTTP 200 with the site's
  // homepage — no "closed" wording anywhere for the text check below to catch,
  // so it read as live. The reliable signal is the redirect target: we asked
  // for a deep posting URL and landed on a root or browse page.
  //
  // isJunkUrl already encodes "this is a listing/root page, not a posting", so
  // reuse it rather than growing a second set of rules.
  const landed = meta.url ?? "";
  const asked = meta.sourceURL ?? url;
  if (landed && landed !== asked && isJunkUrl(landed) && !isJunkUrl(asked)) {
    const out: VerifyResult = { status: "closed", checkedAt: now() };
    await store(url, out);
    return out;
  }

  // Metadata first — on JS-heavy boards (Workday, SuccessFactors) the og tags
  // carry the full description while the rendered body is still a spinner.
  const text = [
    meta.ogDescription ?? "",
    meta.description ?? "",
    meta.title ?? "",
    body.data.markdown ?? "",
  ]
    .join(" ")
    .slice(0, 20_000);

  // Nothing came back at all — a shell with no metadata tells us nothing, and
  // guessing "live" here would be inventing a fact.
  if (text.replace(/\s+/g, "").length < 80) {
    return { status: "unverifiable", checkedAt: now() };
  }

  const out: VerifyResult = {
    status: readsClosed(text) ? "closed" : "live",
    checkedAt: now(),
  };
  await store(url, out);
  return out;
}
