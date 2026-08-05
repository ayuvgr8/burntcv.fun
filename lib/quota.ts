// Monthly quota counters for the third-party services behind the jobs feature
// (see docs/jobs-feed-spec.md §5). Same shape as spendcap.ts, one critical
// difference: this FAILS CLOSED.
//
// spendcap.ts fails open because a limiter outage must never take roasting
// down — roasting is the product. The jobs column is a bonus section attached
// to an already-delivered Glow-Up, so the trade runs the other way: if we can't
// prove we're under quota, we don't spend. Every service here is on a free tier
// with a HARD block and no overage billing, so the failure we're guarding
// against isn't a surprise invoice — it's silently burning the month's
// allowance in an afternoon and having the feature dark until the 1st.
//
// Caps are deliberately set BELOW the true vendor limits so we degrade on our
// own terms (a labelled empty state) rather than on a vendor 429.

import { getRedis } from "./redis";

export type QuotaService = "jsearch" | "adzuna" | "firecrawl";

// True free-tier limits, for reference — the defaults below sit under each:
//   jsearch   200 requests/month (RapidAPI Basic, hard block)
//   adzuna    1,000 calls/month
//   firecrawl 1,000 credits/month
const CAPS: Record<QuotaService, number> = {
  jsearch: Number(process.env.JSEARCH_MONTHLY_CAP ?? 180),
  adzuna: Number(process.env.ADZUNA_MONTHLY_CAP ?? 900),
  firecrawl: Number(process.env.FIRECRAWL_MONTHLY_CAP ?? 900),
};

const redis = getRedis();
const MONTH_SECONDS = 60 * 60 * 24 * 40; // self-expire well after the window

function month(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}
function keyFor(service: QuotaService, m: string): string {
  return `burntcv:quota:${service}:${m}`;
}

// ---- in-memory fallback (non-production only) ----
// On serverless each warm instance would get its own counter, which under-counts
// badly across a fleet. That's tolerable locally and NOT tolerable in prod, so
// production without Redis reports "no quota" and the feature degrades off.
const mem = new Map<string, number>();
function memUsed(key: string): number {
  return mem.get(key) ?? 0;
}

export const durableQuota = !!redis;

// Is there room for `units` more of this service this month?
export async function quotaAvailable(
  service: QuotaService,
  units = 1,
): Promise<boolean> {
  const cap = CAPS[service];
  if (!Number.isFinite(cap) || cap <= 0) return false;
  const key = keyFor(service, month());

  if (redis) {
    try {
      const raw = await redis.get<string>(key);
      const used = raw === null || raw === undefined ? 0 : Number(raw);
      // Same trap as spendcap.ts had: `NaN + units <= cap` is false, so an
      // unparseable counter would disable the feature with no explanation.
      // Here failing closed IS the right answer — these are hard-capped free
      // tiers and we can't prove we're under the limit — but it must be a
      // deliberate, logged decision rather than an accident of NaN comparison.
      if (!Number.isFinite(used)) {
        console.error(`[quota] non-numeric counter for ${service}, denying:`, raw);
        return false;
      }
      return used + units <= cap;
    } catch (err) {
      // Fail CLOSED — see the header note.
      console.error(`[quota] read error for ${service}, denying:`, err);
      return false;
    }
  }

  if (process.env.NODE_ENV === "production") return false;
  return memUsed(key) + units <= cap;
}

// Record consumption after a successful call. Firecrawl passes credits, the
// job APIs pass 1 per request.
export async function recordQuota(
  service: QuotaService,
  units = 1,
): Promise<void> {
  if (units <= 0) return;
  const key = keyFor(service, month());

  if (redis) {
    try {
      const total = await redis.incrby(key, units);
      if (total === units) await redis.expire(key, MONTH_SECONDS);
    } catch (err) {
      console.error(`[quota] record error for ${service}:`, err);
    }
    return;
  }

  if (process.env.NODE_ENV === "production") return;
  mem.set(key, memUsed(key) + units);
}

// Snapshot for the health route / debugging. Never throws.
export async function quotaUsage(): Promise<Record<QuotaService, { used: number; cap: number }>> {
  const m = month();
  const services: QuotaService[] = ["jsearch", "adzuna", "firecrawl"];
  const out = {} as Record<QuotaService, { used: number; cap: number }>;
  for (const s of services) {
    let used = 0;
    if (redis) {
      try {
        const raw = await redis.get<string>(keyFor(s, m));
        used = raw ? Number(raw) : 0;
      } catch {
        used = -1; // unknown
      }
    } else {
      used = memUsed(keyFor(s, m));
    }
    out[s] = { used, cap: CAPS[s] };
  }
  return out;
}
