import { NextResponse } from "next/server";
import { restorePass } from "@/lib/entitlements";
import { checkRestore, ipFrom } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Restore a Pass on a new device with the SECRET restore code. Email-only
// restore is disabled (it would let anyone who knows a buyer's email steal the
// Pass); a magic-link email flow is planned. Returns a fresh signed token.
export async function POST(req: Request) {
  // Rate-limit per IP so this endpoint can't be used to fish for other people's
  // Passes (the restore keyspace — especially email — is small enough to matter).
  if (!(await checkRestore(ipFrom(req)))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { code?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, pass });
}
