import { NextResponse } from "next/server";
import { usingDurableRateLimit } from "@/lib/ratelimit";
import { platformModel } from "@/lib/anthropic";
import { durableQuota, quotaUsage } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight health/readiness probe. Reports capability booleans only —
// never the key itself. `serverKey` answers "can this deploy serve a
// platform-key roast?", which either the gateway key or the direct key
// satisfies; `gateway` says which path those calls take.
//
// `quota` reports how much of each third-party monthly allowance the live job
// openings have spent. These are hard-capped free tiers that block outright
// when exhausted, and the counters live in Redis where nothing else can read
// them — so without this the only way to answer "is the cache actually working
// in production?" was to guess. Counts, caps and percentages only: no keys, no
// URLs, nothing that isn't already implied by the booleans above.
//
// `used: -1` means the counter could not be read (Redis error), not zero.
export async function GET() {
  const quota = await quotaUsage();
  const withPct = Object.fromEntries(
    Object.entries(quota).map(([service, { used, cap }]) => [
      service,
      { used, cap, pct: cap > 0 && used >= 0 ? Math.round((used / cap) * 100) : null },
    ]),
  );

  return NextResponse.json({
    ok: true,
    serverKey: !!(
      process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY
    ),
    gateway: !!process.env.AI_GATEWAY_API_KEY,
    durableRateLimit: usingDurableRateLimit,
    model: platformModel,
    jobs: {
      enabled: process.env.JOBS_ENABLED !== "false",
      discovery: !!process.env.JSEARCH_RAPIDAPI_KEY || !!process.env.ADZUNA_APP_ID,
      verification: !!process.env.FIRECRAWL_API_KEY,
      // False here means the quota counters aren't durable, which in production
      // disables the feature by design (quota.ts fails closed).
      durableQuota,
    },
    quota: withPct,
    time: new Date().toISOString(),
  });
}
