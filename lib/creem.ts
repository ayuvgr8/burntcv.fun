// Creem (Merchant of Record) — international USD checkout for the 6-Month Pass.
// India keeps Razorpay/UPI; the rest of the world buys the Pass ($7.20, one-time)
// through Creem, which handles global cards + tax. A Creem-bought Pass mints the
// exact same entitlement as a Razorpay one (see ensurePassForOrder), so nothing
// downstream in the app needs to know which gateway paid.
//
// Env:
//   CREEM_API_KEY        (creem_test_… → test API; creem_live_… → production)
//   CREEM_PRODUCT_ID     the "$7.20 6-Month Pass" product
//   CREEM_WEBHOOK_SECRET signs the checkout.completed webhook

import { createHmac, timingSafeEqual } from "node:crypto";

const API_KEY = process.env.CREEM_API_KEY || "";
const PRODUCT_ID = process.env.CREEM_PRODUCT_ID || "";
const WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || "";

// Test and live are fully isolated environments with separate base URLs.
const BASE = API_KEY.startsWith("creem_test_")
  ? "https://test-api.creem.io/v1"
  : "https://api.creem.io/v1";

export const creemConfigured = !!(API_KEY && PRODUCT_ID);

// Create a hosted checkout session for the Pass. Creem appends `checkout_id`
// (and a signature) to success_url on redirect back.
export async function createCheckout(
  successUrl: string,
): Promise<{ id: string; url: string } | null> {
  if (!creemConfigured) return null;
  try {
    const res = await fetch(`${BASE}/checkouts`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ product_id: PRODUCT_ID, success_url: successUrl }),
    });
    if (!res.ok) {
      console.error("[creem] create checkout failed:", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return null;
    }
    const data = (await res.json()) as { id: string; checkout_url: string };
    return { id: data.id, url: data.checkout_url };
  } catch (err) {
    console.error("[creem] create checkout error:", err);
    return null;
  }
}

export interface CreemCheckout {
  id: string;
  status: string; // "completed" once paid
  email: string;
}

// Retrieve a checkout server-side to confirm it's paid (trusted via API key —
// we don't rely on the redirect signature).
export async function retrieveCheckout(
  checkoutId: string,
): Promise<CreemCheckout | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(
      `${BASE}/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`,
      { headers: { "x-api-key": API_KEY } },
    );
    if (!res.ok) return null;
    const d = (await res.json()) as Record<string, unknown>;
    const email = extractEmail(d);
    return { id: String(d.id ?? checkoutId), status: String(d.status ?? ""), email };
  } catch {
    return null;
  }
}

// Verify the checkout.completed webhook: HMAC-SHA256(rawBody, webhook secret),
// constant-time compared against the `creem-signature` header.
export function verifyCreemWebhook(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Customer email can sit in a few places depending on payload shape; it's only
// used for restore-by-email (nice-to-have), so we probe defensively.
export function extractEmail(o: Record<string, unknown> | null | undefined): string {
  if (!o) return "";
  const any = o as Record<string, unknown> & {
    customer?: { email?: string };
    order?: { customer?: { email?: string } };
    customer_email?: string;
  };
  const email = any.customer?.email || any.order?.customer?.email || any.customer_email || "";
  return email && email !== "void@razorpay.com" ? email : "";
}
