import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vanity base so the counter reads as a living product from day one instead of
// starting near zero. Real, durable roasts accumulate in Redis under
// "roast:count" (incremented in app/api/roast/route.ts); the number we show is
// BASE + that. It's a public tally, not personal data — the "we never store
// résumés" promise is untouched.
const BASE = 48210;

export async function GET() {
  let n = 0;
  try {
    const raw = await getRedis()?.get<string>("roast:count");
    n = raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    n = 0;
  }
  return NextResponse.json(
    { count: BASE + n },
    { headers: { "cache-control": "no-store" } },
  );
}
