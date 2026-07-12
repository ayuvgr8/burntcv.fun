import { NextResponse } from "next/server";
import { checkFeedback, ipFrom } from "@/lib/ratelimit";
import { getRedis } from "@/lib/redis";
import { sendEmail, feedbackEmailHtml } from "@/lib/email";
import { validate, vEnum, vString } from "@/lib/validate";

export const runtime = "nodejs";

const TYPES = ["bug", "idea", "other"] as const;
const MAX_MESSAGE = 4000;
const MAX_EMAIL = 254;

const feedbackSchema = {
  message: vString({ trim: true, min: 3, max: MAX_MESSAGE }),
  // Email is kept lenient (optional, capped) — a typo shouldn't lose feedback;
  // it's normalised to null below rather than rejected.
  email: vString({ optional: true, trim: true, max: MAX_EMAIL }),
  type: vEnum(TYPES, { optional: true, default: "other", lower: true }),
};

// Collect user feedback: archive it durably (Redis) and email it to FEEDBACK_TO.
// Public POST, so it's IP rate-limited + honeypot-guarded, and always returns a
// uniform success so bots learn nothing.
export async function POST(req: Request) {
  if (!(await checkFeedback(ipFrom(req)))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "website" field. Bots do →
  // pretend success and drop it. Checked on the raw body BEFORE strict
  // validation so a junk-filling bot still just gets a uniform success.
  const website = (raw as Record<string, unknown>).website;
  if (typeof website === "string" && website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const parsed = validate(feedbackSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 });
  }
  const { message, type } = parsed.value;
  const validEmail = parsed.value.email.includes("@") ? parsed.value.email : "";

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
