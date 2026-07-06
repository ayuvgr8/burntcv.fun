import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ensurePassForOrder } from "@/lib/entitlements";

export const runtime = "nodejs";

const PASS_PAISE = 19900; // ₹199 pass

// Razorpay webhook — the reliability net. Even if the browser closes before the
// client's verify call returns, this fires server→server and grants the Pass.
// Configure in Razorpay Dashboard → Settings → Webhooks:
//   URL:    https://<your-domain>/api/payment/webhook
//   Events: payment.captured  (order.paid also handled)
//   Secret: set the same value as RAZORPAY_WEBHOOK_SECRET
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers.get("x-razorpay-signature");
  const raw = await req.text(); // MUST verify against the raw body

  if (!secret) {
    // Not configured — the client verify path is primary; acknowledge so
    // Razorpay doesn't retry-storm.
    console.warn("[webhook] no RAZORPAY_WEBHOOK_SECRET set — skipping");
    return NextResponse.json({ skipped: true });
  }

  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature ?? "");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    console.error("[webhook] signature mismatch");
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { order_id?: string; email?: string; contact?: string; amount?: number } };
      order?: { entity?: { id?: string; amount?: number; notes?: { plan?: string } } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  try {
    const pay = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;
    const orderId = pay?.order_id || order?.id;
    const amount = pay?.amount ?? order?.amount;
    const isPass = amount === PASS_PAISE || order?.notes?.plan === "lifetime";

    if (orderId && isPass) {
      const email = pay?.email && pay.email !== "void@razorpay.com" ? pay.email : "";
      await ensurePassForOrder({ orderId, email, region: "IN" });
      console.log("[webhook] pass granted for order", orderId);
    }
  } catch (err) {
    console.error("[webhook] processing error:", err);
    // Still 200 so Razorpay doesn't retry indefinitely on our internal errors.
  }

  return NextResponse.json({ ok: true });
}
