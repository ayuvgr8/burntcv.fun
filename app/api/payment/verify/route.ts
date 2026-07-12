import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ensurePassForOrder } from "@/lib/entitlements";
import { ipFrom, limitPublic, rateLimitedResponse } from "@/lib/ratelimit";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";

// Razorpay identifiers are short opaque strings; cap them defensively.
const verifySchema = {
  razorpay_order_id: vString({ trim: true, max: 256 }),
  razorpay_payment_id: vString({ trim: true, max: 256 }),
  razorpay_signature: vString({ trim: true, max: 256 }),
  plan: vString({ optional: true, max: 64 }),
};

// Verify a Razorpay payment signature server-side (never trust the client).
// Signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret).
// On a verified Pass (₹199) payment, mint the durable entitlement + token.
export async function POST(req: Request) {
  const gate = await limitPublic(ipFrom(req), "payment_verify");
  if (!gate.allowed) return rateLimitedResponse(gate.retryAfter);

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    // No secret configured → demo mode, accept (don't require live-mode fields).
    return NextResponse.json({ ok: true, simulated: true });
  }

  // Live mode: every field is required and length-bounded.
  const parsed = await parseJsonBody(req, verifySchema);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false }, { status: parsed.status });
  }
  const body = parsed.value;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  const expected = createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(razorpay_signature);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    console.error("[payment] signature mismatch — not marking as paid");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Pass purchase → create the durable entitlement (idempotent per order).
  if (body.plan === "lifetime") {
    try {
      const email = await fetchPaymentEmail(razorpay_payment_id);
      const pass = await ensurePassForOrder({ orderId: razorpay_order_id, email, region: "IN" });
      return NextResponse.json({ ok: true, pass });
    } catch (err) {
      console.error("[payment] entitlement mint failed:", err);
      // Payment is valid; the webhook will reconcile the Pass shortly.
      return NextResponse.json({ ok: true, pass: null });
    }
  }

  return NextResponse.json({ ok: true });
}

async function fetchPaymentEmail(paymentId: string): Promise<string> {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return "";
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: {
      authorization:
        "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
    },
  });
  if (!res.ok) return "";
  const p = (await res.json()) as { email?: string };
  return p.email && p.email !== "void@razorpay.com" ? p.email : "";
}
