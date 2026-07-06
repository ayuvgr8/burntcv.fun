// Transactional email via Resend (REST API — no SDK dependency). Only used for
// the magic-link Pass restore today. Sending needs RESEND_API_KEY; the from
// address is RESEND_FROM (must be on a Resend-verified domain). If the key is
// absent (e.g. local dev) we no-op and report failure so callers can degrade.

const RESEND_URL = "https://api.resend.com/emails";

export const emailConfigured = !!process.env.RESEND_API_KEY;

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "BurntCV <passes@burntcv.fun>";
  if (!key) {
    console.error("[email] RESEND_API_KEY not set — cannot send");
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: args.to, subject: args.subject, html: args.html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] send failed:", res.status, detail.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send error:", err);
    return false;
  }
}

// The magic-link restore email. `link` already carries the signed token.
export function restoreEmailHtml(link: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#faf9f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0623;">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
      <div style="font-size:22px;font-weight:900;letter-spacing:-.02em;">🔥 BurntCV</div>
      <h1 style="font-size:20px;margin:24px 0 8px;">Restore your Pass</h1>
      <p style="font-size:15px;line-height:1.55;color:#5a5a5a;margin:0 0 24px;">
        Tap the button below to restore your 6-Month Pass on this device. This link
        works once and expires in 15 minutes.
      </p>
      <a href="${link}" style="display:inline-block;background:#ed3237;color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 22px;border-radius:12px;">
        Restore my Pass →
      </a>
      <p style="font-size:12.5px;line-height:1.5;color:#9c9c9c;margin:28px 0 0;">
        If you didn't request this, you can ignore it — nothing happens until the
        link is opened. Trouble with the button? Paste this into your browser:<br/>
        <span style="word-break:break-all;color:#4e3188;">${link}</span>
      </p>
    </div>
  </body>
</html>`;
}
