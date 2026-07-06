import { NextResponse } from "next/server";
import { retrieveCheckout } from "@/lib/creem";
import { ensurePassForOrder } from "@/lib/entitlements";

export const runtime = "nodejs";

// On return from Creem, confirm the checkout is paid (server-side, via the API
// key) and act on the SERVER-verified product — never a client-sent hint:
//   • pass                    → mint the same 6-Month Pass entitlement a Razorpay
//                               purchase would (idempotent per checkout id; the
//                               webhook is the reliability net).
//   • glowup / glowup_topup   → nothing to mint; tell the client to run the
//                               one-off Glow-Up.
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
  if (!co.kind) {
    return NextResponse.json({ error: "unknown_product" }, { status: 422 });
  }

  if (co.kind === "glowup") {
    // One-off unlock — the Glow-Up itself runs client-side after this confirms.
    return NextResponse.json({ ok: true, kind: "glowup" });
  }

  // Namespace the ref so Creem checkouts never collide with Razorpay orders.
  const pass = await ensurePassForOrder({ orderId: `creem:${co.id}`, email: co.email });
  return NextResponse.json({ ok: true, kind: "pass", pass });
}
