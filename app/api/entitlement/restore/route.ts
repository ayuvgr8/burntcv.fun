import { NextResponse } from "next/server";
import { restorePass } from "@/lib/entitlements";
import { checkRestore, ipFrom } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Restore a Pass on a new device: paste the restore code (or the email you
// paid with). Returns a fresh signed token for this device.
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

  if (!body.code && !body.email) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  const pass = await restorePass({ code: body.code, email: body.email });
  if (!pass) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, pass });
}
