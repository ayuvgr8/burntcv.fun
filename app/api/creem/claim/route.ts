import { NextResponse } from "next/server";
import { retrieveCheckout } from "@/lib/creem";
import { ensurePassForOrder } from "@/lib/entitlements";
import { ipFrom, limitAuth, recordAuthFailure, recordAuthSuccess } from "@/lib/ratelimit";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";

const claimSchema = { checkoutId: vString({ trim: true, max: 256 }) };

// On return from Creem, confirm the checkout is paid (server-side, via the API
// key) and act on the SERVER-verified product — never a client-sent hint:
//   • pass                    → mint the same 6-Month Pass entitlement a Razorpay
//                               purchase would (idempotent per checkout id; the
//                               webhook is the reliability net).
//   • glowup / glowup_topup   → nothing to mint; tell the client to run the
//                               one-off Glow-Up.
export async function POST(req: Request) {
  const ip = ipFrom(req);

  const parsed = await parseJsonBody(req, claimSchema);
  if (!parsed.ok) {
    // Preserve the existing "missing" code for an absent id.
    const error = parsed.error === "missing" ? "missing" : parsed.error;
    return NextResponse.json({ error, field: parsed.field }, { status: parsed.status });
  }
  const checkoutId = parsed.value.checkoutId;
  if (!checkoutId) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  // Strict auth-tier limit: this mints a paid entitlement from a checkout id, so
  // treat the id like a credential — per-IP + per-id windows and exponential
  // backoff so it can't be brute-forced to claim someone else's Pass. A bad/
  // unpaid id ratchets the backoff; a completed one clears it.
  const gate = await limitAuth({ ip, account: checkoutId });
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: gate.retryAfter },
      { status: 429, headers: { "retry-after": String(gate.retryAfter) } },
    );
  }

  const co = await retrieveCheckout(checkoutId);
  if (!co) {
    await recordAuthFailure({ ip, account: checkoutId });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (co.status !== "completed") {
    await recordAuthFailure({ ip, account: checkoutId });
    return NextResponse.json({ error: "not_paid", status: co.status }, { status: 402 });
  }
  await recordAuthSuccess({ ip, account: checkoutId });
  if (!co.kind) {
    return NextResponse.json({ error: "unknown_product" }, { status: 422 });
  }

  if (co.kind === "glowup" || co.kind === "glowup_topup") {
    // One-off unlock — the Glow-Up itself runs client-side after this confirms.
    return NextResponse.json({ ok: true, kind: co.kind });
  }

  // Namespace the ref so Creem checkouts never collide with Razorpay orders.
  const pass = await ensurePassForOrder({ orderId: `creem:${co.id}`, email: co.email, region: "INTL" });
  return NextResponse.json({ ok: true, kind: "pass", pass });
}
