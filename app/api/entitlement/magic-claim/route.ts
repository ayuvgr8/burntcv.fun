import { NextResponse } from "next/server";
import { verifyMagicToken, restorePass } from "@/lib/entitlements";
import { checkRestore, ipFrom } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Complete a magic-link restore: the client posts the token from the ?restore=
// link. We verify the signature + expiry, then hand back a fresh Pass token for
// this device. Rate-limited per IP like the other restore paths.
export async function POST(req: Request) {
  if (!(await checkRestore(ipFrom(req)))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const code = verifyMagicToken(body.token);
  if (!code) {
    // Bad signature or expired (>15 min) → ask them to request a new link.
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
  }

  const pass = await restorePass({ code });
  if (!pass) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, pass });
}
