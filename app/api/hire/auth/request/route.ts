import { NextResponse } from "next/server";
import { signMagic } from "@/lib/hire/auth";
import { jsonError } from "@/lib/hire/api";
import { emailConfigured, sendEmail } from "@/lib/email";
import { ipFrom, limitPublic } from "@/lib/ratelimit";
import { parseJsonBody, vEmail, vString } from "@/lib/validate";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://burntcv.fun";

function signInEmailHtml(link: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#101828;">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
      <div style="font-size:20px;font-weight:900;letter-spacing:-.02em;">BurntCV <span style="color:#1a56db;">Hire</span></div>
      <h1 style="font-size:20px;margin:24px 0 8px;">Sign in to BurntCV Hire</h1>
      <p style="font-size:15px;line-height:1.55;color:#475467;margin:0 0 24px;">
        Tap the button below to open your recruiter workspace. This link works
        once and expires in 15 minutes.
      </p>
      <a href="${link}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 22px;border-radius:10px;">
        Open my workspace →
      </a>
      <p style="font-size:12.5px;line-height:1.5;color:#98a2b3;margin:28px 0 0;">
        If you didn't request this, ignore it — nothing happens until the link is
        opened. Trouble with the button? Paste this into your browser:<br/>
        <span style="word-break:break-all;color:#1a56db;">${link}</span>
      </p>
    </div>
  </body>
</html>`;
}

// Start recruiter sign-in: email in → magic link out (via Resend). In local
// dev without RESEND_API_KEY the link is returned in the response, clearly
// labeled devMode — never in production.
export async function POST(req: Request) {
  const gate = await limitPublic(ipFrom(req), "hire-auth");
  if (!gate.allowed) {
    return jsonError(429, "rate_limited", { retryAfter: gate.retryAfter });
  }

  const body = await parseJsonBody(req, {
    email: vEmail({ max: 254 }),
    orgName: vString({ max: 80, optional: true }),
  });
  if (!body.ok) return jsonError(body.status, body.error);

  const email = body.value.email.toLowerCase().trim();
  const token = signMagic(email, body.value.orgName ?? "");
  const link = `${SITE_URL}/hire/app?ht=${encodeURIComponent(token)}`;

  if (emailConfigured) {
    const sent = await sendEmail({
      to: email,
      subject: "Sign in to BurntCV Hire",
      html: signInEmailHtml(link),
    });
    if (!sent) return jsonError(502, "email_failed");
    return NextResponse.json({ sent: true });
  }

  // No email configured. In production this is a hard stop — handing the
  // sign-in link back to whoever typed the email would be account takeover.
  // The inline link is a LOCAL DEV convenience only.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    console.error("[hire:auth] RESEND_API_KEY not set in production — sign-in unavailable");
    return jsonError(503, "email_not_configured");
  }
  console.warn("[hire:auth] RESEND_API_KEY not set — returning dev sign-in link");
  return NextResponse.json({ sent: false, devMode: true, devLink: link });
}
