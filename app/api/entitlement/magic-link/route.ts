import { NextResponse } from "next/server";
import { codeForEmail, signMagicToken } from "@/lib/entitlements";
import { sendEmail, restoreEmailHtml } from "@/lib/email";
import { checkRestore, ipFrom } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Email the buyer a one-tap link to restore their Pass. The link goes to the
// address ON FILE (never a token to the requester), so only the mailbox owner
// can restore — this is what makes email recovery safe.
//
// Always responds { ok: true } regardless of whether the email has a Pass, so
// the endpoint can't be used to enumerate who bought. Rate-limited per IP.
export async function POST(req: Request) {
  if (!(await checkRestore(ipFrom(req)))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }

  // Fire only if this email actually has a Pass — but never reveal that.
  const code = await codeForEmail(email);
  if (code) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://burntcv.fun";
    const link = `${base}/?restore=${encodeURIComponent(signMagicToken(code))}`;
    await sendEmail({
      to: email,
      subject: "Restore your BurntCV Pass 🔥",
      html: restoreEmailHtml(link),
    });
  }

  // Uniform response — no account enumeration.
  return NextResponse.json({ ok: true });
}
