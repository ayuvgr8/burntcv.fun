import { NextResponse } from "next/server";
import { createCheckout, creemConfigured } from "@/lib/creem";

export const runtime = "nodejs";

// Start an international Pass purchase — returns a Creem hosted-checkout URL the
// client redirects to. Creem sends the user back to /?creem=success&checkout_id=…
export async function POST(req: Request) {
  if (!creemConfigured) {
    // No keys configured → simulated (demo), mirroring the Razorpay flow.
    return NextResponse.json({ simulated: true });
  }
  const origin = new URL(req.url).origin;
  const checkout = await createCheckout(`${origin}/?creem=success`);
  if (!checkout) {
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
  return NextResponse.json({ url: checkout.url });
}
