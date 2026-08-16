import { NextResponse } from "next/server";
import {
  getProRecord,
  restorePro,
  statusFor,
  verifyProToken,
} from "@/lib/pro/entitlements";
import {
  ipFrom,
  limitAuth,
  limitPublic,
  rateLimitedResponse,
  recordAuthFailure,
  recordAuthSuccess,
} from "@/lib/ratelimit";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";

// BurntCV Pro entitlement status + restore.
//   { token }  → live status (credits left / pass expiry) for the UI badge.
//   { code }   → restore on a new device with the secret PRO- code. Guessing
//                codes is treated like an auth surface: strict per-IP +
//                per-code limits with backoff (same tier as Pass restore).
export async function POST(req: Request) {
  const body = await parseJsonBody(req, {
    token: vString({ optional: true, max: 2048 }),
    code: vString({ optional: true, max: 20, trim: true }),
  });
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }
  const ip = ipFrom(req);

  if (body.value.code) {
    const gate = await limitAuth({ ip, account: body.value.code.toUpperCase() });
    if (!gate.allowed) return rateLimitedResponse(gate.retryAfter);
    const status = await restorePro(body.value.code);
    if (!status) {
      await recordAuthFailure({ ip, account: body.value.code.toUpperCase() });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await recordAuthSuccess({ ip, account: body.value.code.toUpperCase() });
    return NextResponse.json({ pro: status });
  }

  const burst = await limitPublic(ip, "pro");
  if (!burst.allowed) return rateLimitedResponse(burst.retryAfter);

  const claims = verifyProToken(body.value.token);
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  const rec = await getProRecord(claims.code);
  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ pro: await statusFor(rec) });
}
