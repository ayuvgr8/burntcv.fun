import { NextResponse } from "next/server";
import { usingDurableRateLimit } from "@/lib/ratelimit";
import { platformModel } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight health/readiness probe. Reports capability booleans only —
// never the key itself. `serverKey` answers "can this deploy serve a
// platform-key roast?", which either the gateway key or the direct key
// satisfies; `gateway` says which path those calls take.
export async function GET() {
  return NextResponse.json({
    ok: true,
    serverKey: !!(
      process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY
    ),
    gateway: !!process.env.AI_GATEWAY_API_KEY,
    durableRateLimit: usingDurableRateLimit,
    model: platformModel,
    time: new Date().toISOString(),
  });
}
