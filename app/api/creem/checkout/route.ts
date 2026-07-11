import { NextResponse } from "next/server";
import { createCheckout, creemConfiguredFor, type CreemKind } from "@/lib/creem";
import { ipFrom, limitPublic, rateLimitedResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Start an international purchase — returns a Creem hosted-checkout URL the
// client redirects to. `kind` picks the product: "pass" ($9.99 6-Month Pass),
// "glowup" ($4.99 one-off) or "glowup_topup" ($3.99, a Pass holder's 5th+
// Glow-Up). Creem sends the user back to /?creem=success&kind=…&checkout_id=… —
// the claim step re-verifies the product server-side, so the `kind` in the URL
// is only a UX hint, never trusted for entitlement.
export async function POST(req: Request) {
  const gate = await limitPublic(ipFrom(req), "creem_checkout");
  if (!gate.allowed) return rateLimitedResponse(gate.retryAfter);

  let kind: CreemKind = "pass";
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.kind === "glowup" || body?.kind === "glowup_topup") kind = body.kind;
  } catch {
    // default to "pass"
  }

  if (!creemConfiguredFor(kind)) {
    // No keys/product configured → simulated (demo), mirroring the Razorpay flow.
    return NextResponse.json({ simulated: true });
  }

  const origin = new URL(req.url).origin;
  const checkout = await createCheckout(kind, `${origin}/?creem=success&kind=${kind}`);
  if (!checkout) {
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
  return NextResponse.json({ url: checkout.url });
}
