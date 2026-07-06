import { NextResponse } from "next/server";
import { checkFeedback, ipFrom } from "@/lib/ratelimit";
import { getRedis } from "@/lib/redis";
import { sendEmail, feedbackEmailHtml } from "@/lib/email";

export const runtime = "nodejs";

const TYPES = new Set(["bug", "idea", "other"]);
const MAX_MESSAGE = 4000;
const MAX_EMAIL = 254;

// Collect user feedback: archive it durably (Redis) and email it to FEEDBACK_TO.
// Public POST, so it's IP rate-limited + honeypot-guarded, and always returns a
// uniform success so bots learn nothing.
export async function POST(req: Request) {
  if (!(await checkFeedback(ipFrom(req)))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { message?: string; email?: string; type?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "website" field. Bots do →
  // pretend success and drop it.
  if (body.website && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE);
  if (message.length < 3) {
    return NextResponse.json({ error: "too_short" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().slice(0, MAX_EMAIL);
  const validEmail = email && email.includes("@") ? email : "";
  const type = TYPES.has((body.type ?? "").toLowerCase())
    ? (body.type as string).toLowerCase()
    : "other";

  const entry = {
    ts: Date.now(),
    type,
    message,
    email: validEmail || null,
  };

  // 1) Durable archive first (backup + running log), so nothing is lost even if
  //    email delivery later fails. Fire-and-forget; never block the response.
  const redis = getRedis();
  if (redis) {
    try {
      await redis.lpush("feedback:log", JSON.stringify(entry));
      await redis.ltrim("feedback:log", 0, 999); // keep the last 1000
    } catch (err) {
      console.error("[feedback] redis archive failed:", err);
    }
  }

  // 2) Notify by email if a destination is configured. Absent FEEDBACK_TO (or
  //    RESEND key) → we still archived above, so this safely no-ops.
  const to = process.env.FEEDBACK_TO;
  if (to) {
    await sendEmail({
      to,
      subject: `Feedback · ${type} — BurntCV`,
      html: feedbackEmailHtml({ type, message, email: validEmail || undefined }),
      replyTo: validEmail || undefined,
    });
  } else {
    console.warn("[feedback] FEEDBACK_TO not set — archived to Redis only");
  }

  return NextResponse.json({ ok: true });
}
