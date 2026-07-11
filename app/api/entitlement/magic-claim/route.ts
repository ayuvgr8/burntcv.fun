import { NextResponse } from "next/server";
import { verifyMagicToken, restorePass } from "@/lib/entitlements";
import { ipFrom, limitAuth, recordAuthFailure, recordAuthSuccess } from "@/lib/ratelimit";

export const runtime = "nodejs";

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "rate_limited", retryAfter },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

// Complete a magic-link restore: the client posts the token from the ?restore=
// link. We verify the signature + expiry, then hand back a fresh Pass token for
// this device. Strict auth-tier limit (per-IP + backoff) like the other restore
// paths, so a leaked/guessed link can't be replayed at scale.
export async function POST(req: Request) {
  const ip = ipFrom(req);

  const gate = await limitAuth({ ip });
  if (!gate.allowed) return tooMany(gate.retryAfter);

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const code = verifyMagicToken(body.token);
  if (!code) {
    // Bad signature or expired (>15 min) → ask them to request a new link.
    await recordAuthFailure({ ip });
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
  }

  const pass = await restorePass({ code });
  if (!pass) {
    await recordAuthFailure({ ip, account: code });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await recordAuthSuccess({ ip, account: code });
  return NextResponse.json({ ok: true, pass });
}
