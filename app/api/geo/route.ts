import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // per-request, never cached

// Which payment rail to show. India → Razorpay/UPI; everyone else (incl.
// undetected/VPN) → Creem/USD. Vercel injects `x-vercel-ip-country` at the edge;
// locally it's absent → treated as international (safe: foreigners never get
// stuck on a UPI-only checkout).
export function GET(req: Request) {
  const country = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  return NextResponse.json({ country, india: country === "IN" });
}
