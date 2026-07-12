import { NextResponse } from "next/server";
import { restorePass } from "@/lib/entitlements";
import { ipFrom, limitAuth, recordAuthFailure, recordAuthSuccess } from "@/lib/ratelimit";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";

// `code` is the secret restore code; `email` is only used to tailor the error
// message (email-only restore is disabled). Both optional + length-capped —
// the "missing code" cases are handled explicitly below.
const restoreSchema = {
  code: vString({ optional: true, trim: true, max: 128 }),
  email: vString({ optional: true, trim: true, max: 254 }),
};

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "rate_limited", retryAfter },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

// Restore a Pass on a new device with the SECRET restore code. Email-only
// restore is disabled (it would let anyone who knows a buyer's email steal the
// Pass); a magic-link email flow is planned. Returns a fresh signed token.
export async function POST(req: Request) {
  const ip = ipFrom(req);

  const parsed = await parseJsonBody(req, restoreSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  }
  const body = parsed.value;

  // Strict, auth-tier limit: per-IP AND per-account (the restore code) sliding
  // windows + exponential backoff, so this endpoint can't be brute-forced to
  // fish for other people's Passes (the restore keyspace is small enough to
  // matter). A wrong code ratchets the backoff; a correct one clears it.
  const gate = await limitAuth({ ip, account: body.code });
  if (!gate.allowed) return tooMany(gate.retryAfter);

  if (!body.code) {
    // No code → can't restore. Distinguish "you typed an email" (needs the code)
    // from "you typed nothing" so the client can show the right message.
    return NextResponse.json(
      { error: body.email ? "email_restore_disabled" : "missing" },
      { status: 400 },
    );
  }

  const pass = await restorePass({ code: body.code });
  if (!pass) {
    await recordAuthFailure({ ip, account: body.code });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await recordAuthSuccess({ ip, account: body.code });
  return NextResponse.json({ ok: true, pass });
}
