import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PRICE_PAISE: Record<string, number> = {
  single: 700, // ₹7 — free user, past their freebie
  topup: 500, // ₹5 — lifetime user, extra roast past today's 5
  glowup: 500, // ₹5 — the Glow-Up fix-list (free for Pass / BYOK)
  lifetime: 19900, // ₹199
};

// Create a Razorpay order. If keys aren't configured, respond { simulated:true }
// so the client can complete a demo purchase.
export async function POST(req: Request) {
  let plan = "single";
  try {
    const body = await req.json();
    if (body?.plan in PRICE_PAISE) plan = body.plan;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

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
