import { NextResponse } from "next/server";
import { verifyCreemWebhook, extractEmail, kindOf } from "@/lib/creem";
import { ensurePassForOrder } from "@/lib/entitlements";

export const runtime = "nodejs";

// Creem webhook — the reliability net. Fires server→server on checkout.completed
// so the Pass is granted even if the browser closes before the client claim.
// Configure in Creem → Developers → Webhooks: URL
// https://burntcv.fun/api/creem/webhook, secret = CREEM_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const signature = req.headers.get("creem-signature");
  const raw = await req.text(); // verify against the RAW body

  if (!verifyCreemWebhook(raw, signature)) {
    console.error("[creem webhook] bad signature");
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  let event: {
    eventType?: string;
    type?: string;
    object?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  try {
    const kind = event.eventType || event.type;
    if (kind === "checkout.completed") {
      const obj = (event.object || event.data || {}) as Record<string, unknown>;
      const checkoutId = String(obj.id || obj.checkout_id || "");
      // Only the Pass grants a durable entitlement. Glow-Up purchases are one-off
      // and consumed client-side, so we never mint anything for them here. Derive
      // the product server-side; ignore anything that isn't positively the Pass.
      if (checkoutId && kindOf(obj) === "pass") {
        await ensurePassForOrder({
          orderId: `creem:${checkoutId}`,
          email: extractEmail(obj),
          region: "INTL",
        });
        console.log("[creem webhook] pass granted for", checkoutId);
      }
    }
  } catch (err) {
    console.error("[creem webhook] processing error:", err);
    // Still 200 so Creem doesn't retry-storm on our internal errors.
  }

  return NextResponse.json({ ok: true });
}
