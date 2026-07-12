import { NextResponse } from "next/server";
import { codeForEmail, signMagicToken } from "@/lib/entitlements";
import { sendEmail, restoreEmailHtml } from "@/lib/email";
import { ipFrom, limitAuth } from "@/lib/ratelimit";
import { parseJsonBody, vEmail } from "@/lib/validate";

export const runtime = "nodejs";

const magicLinkSchema = { email: vEmail() };

// Email the buyer a one-tap link to restore their Pass. The link goes to the
// address ON FILE (never a token to the requester), so only the mailbox owner
// can restore — this is what makes email recovery safe.
//
// Always responds { ok: true } regardless of whether the email has a Pass, so
// the endpoint can't be used to enumerate who bought. Rate-limited per IP.
export async function POST(req: Request) {
  const ip = ipFrom(req);

  const parsed = await parseJsonBody(req, magicLinkSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  }
  const email = parsed.value.email; // validated + normalised (trimmed, lowercased)

  // Strict auth-tier limit: per-IP AND per-email sliding windows. We do NOT
  // ratchet the failure backoff here — the endpoint returns a uniform response
  // whether or not the email has a Pass, and backoff must not become an
  // enumeration side-channel. The per-email window also stops email-bombing a
  // victim's inbox with restore links.
  const gate = await limitAuth({ ip, account: email });
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: gate.retryAfter },
      { status: 429, headers: { "retry-after": String(gate.retryAfter) } },
    );
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
