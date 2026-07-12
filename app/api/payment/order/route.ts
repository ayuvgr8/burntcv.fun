import { NextResponse } from "next/server";
import { ipFrom, limitPublic, rateLimitedResponse } from "@/lib/ratelimit";
import { parseJsonBody, vEnum } from "@/lib/validate";

export const runtime = "nodejs";

const PRICE_PAISE: Record<string, number> = {
  single: 700, // ₹7 — free user, past their freebie
  topup: 500, // ₹5 — lifetime user, extra roast past today's 5
  glowup: 4900, // ₹49 — the Glow-Up rewrite (4 included with the Pass, then ₹49)
  lifetime: 19900, // ₹199
};
const PLANS = Object.keys(PRICE_PAISE) as (keyof typeof PRICE_PAISE & string)[];

const orderSchema = { plan: vEnum(PLANS, { optional: true, default: "single" }) };

// Create a Razorpay order. If keys aren't configured, respond { simulated:true }
// so the client can complete a demo purchase.
export async function POST(req: Request) {
  const gate = await limitPublic(ipFrom(req), "payment_order");
  if (!gate.allowed) return rateLimitedResponse(gate.retryAfter);

  const parsed = await parseJsonBody(req, orderSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  }
  const plan = parsed.value.plan;

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ simulated: true });
  }

  const amount = PRICE_PAISE[plan];
  // Razorpay minimum is 100 paise (₹1). Amounts are server-derived, but guard anyway.
  if (!amount || amount < 100) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization:
          "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `burntcv_${plan}_${Date.now()}`,
        notes: { plan },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[payment] razorpay order failed:", res.status, detail.slice(0, 200));
      // Bad credentials → 401; anything else from Razorpay → 500.
      if (res.status === 401) {
        return NextResponse.json({ error: "auth_failed" }, { status: 401 });
      }
      return NextResponse.json({ error: "order_failed" }, { status: 500 });
    }
    const order = (await res.json()) as { id: string };
    return NextResponse.json({
      orderId: order.id,
      amount,
      currency: "INR",
    });
  } catch (err) {
    console.error("[payment] order error:", err);
    return NextResponse.json({ error: "order_failed" }, { status: 500 });
  }
}
