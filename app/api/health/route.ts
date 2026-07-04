import { NextResponse } from "next/server";
import { usingDurableRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight health/readiness probe. Reports capability booleans only —
// never the key itself.
export async function GET() {
  return NextResponse.json({
    ok: true,
    serverKey: !!process.env.ANTHROPIC_API_KEY,
    durableRateLimit: usingDurableRateLimit,
    model: process.env.ROAST_MODEL ?? "claude-sonnet-4-6",
    time: new Date().toISOString(),
  });
}
