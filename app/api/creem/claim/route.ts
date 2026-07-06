import { NextResponse } from "next/server";
import { retrieveCheckout } from "@/lib/creem";
import { ensurePassForOrder } from "@/lib/entitlements";

export const runtime = "nodejs";

// On return from Creem, confirm the checkout is paid (server-side, via the API
// key) and mint the same 6-Month Pass entitlement a Razorpay purchase would.
// Idempotent per checkout id. The webhook is the reliability net.
export async function POST(req: Request) {
  let checkoutId = "";
  try {
    checkoutId = (await req.json())?.checkoutId ?? "";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!checkoutId) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  const co = await retrieveCheckout(checkoutId);
  if (!co) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (co.status !== "completed") {
    return NextResponse.json({ error: "not_paid", status: co.status }, { status: 402 });
  }

  // Namespace the ref so Creem checkouts never collide with Razorpay orders.
  const pass = await ensurePassForOrder({ orderId: `creem:${co.id}`, email: co.email });
  return NextResponse.json({ ok: true, pass });
}
