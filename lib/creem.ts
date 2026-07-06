// Creem (Merchant of Record) — international USD checkout. India keeps
// Razorpay/UPI; the rest of the world buys through Creem, which handles global
// cards + sales tax/VAT. Two products are sold internationally:
//   • the 6-Month Pass ($9.99, one-time)  → mints the same entitlement a
//     Razorpay Pass does (see ensurePassForOrder), so nothing downstream cares
//     which gateway paid.
//   • the Glow-Up ($4.99, one-time)        → a one-off unlock, no entitlement;
//     the client just runs the Glow-Up once payment is confirmed.
//
// SECURITY: which product a checkout paid for is ALWAYS derived server-side from
// the checkout's product id (never from a client-sent hint), so a $4.99 Glow-Up
// can't be redeemed as a $9.99 Pass.
//
// Env:
//   CREEM_API_KEY            (creem_test_… → test API; creem_live_… → production)
//   CREEM_PRODUCT_ID         the "$9.99 6-Month Pass" product
//   CREEM_GLOWUP_PRODUCT_ID  the "$4.99 Glow-Up" product
//   CREEM_WEBHOOK_SECRET     signs the checkout.completed webhook

import { createHmac, timingSafeEqual } from "node:crypto";

const API_KEY = process.env.CREEM_API_KEY || "";
const PASS_PRODUCT_ID = process.env.CREEM_PRODUCT_ID || "";
const GLOWUP_PRODUCT_ID = process.env.CREEM_GLOWUP_PRODUCT_ID || "";
const WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || "";

// Test and live are fully isolated environments with separate base URLs.
const BASE = API_KEY.startsWith("creem_test_")
  ? "https://test-api.creem.io/v1"
  : "https://api.creem.io/v1";

export type CreemKind = "pass" | "glowup";

function productFor(kind: CreemKind): string {
  return kind === "glowup" ? GLOWUP_PRODUCT_ID : PASS_PRODUCT_ID;
}

// Is a given checkout purchasable? (Pass needs its product; Glow-Up needs its.)
export function creemConfiguredFor(kind: CreemKind): boolean {
  return !!(API_KEY && productFor(kind));
}
// Back-compat alias — "is the Pass sellable".
export const creemConfigured = creemConfiguredFor("pass");

// Create a hosted checkout for the given product. Creem appends `checkout_id`
// (and a signature) to success_url on redirect back. `metadata.kind` is a
// convenience echo — the server still verifies the real product on claim.
export async function createCheckout(
  kind: CreemKind,
  successUrl: string,
): Promise<{ id: string; url: string } | null> {
  const productId = productFor(kind);
  if (!API_KEY || !productId) return null;
  try {
    const res = await fetch(`${BASE}/checkouts`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({
        product_id: productId,
        success_url: successUrl,
        metadata: { kind },
      }),
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
  kind: CreemKind | null; // server-determined product; null if unrecognised
}

// Retrieve a checkout server-side to confirm it's paid AND which product it was
// (trusted via API key — we don't rely on the redirect signature or any client
// hint). `kind` is resolved from the checkout's product id.
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
    return {
      id: String(d.id ?? checkoutId),
      status: String(d.status ?? ""),
      email: extractEmail(d),
      kind: kindOf(d),
    };
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

// Determine which product a checkout/webhook object refers to, from the server's
// own product ids. Prefers the (authoritative) product id; falls back to the
// metadata.kind echo we set at creation. Returns null if it matches neither —
// callers must NOT grant anything on an unrecognised product.
export function kindOf(o: Record<string, unknown> | null | undefined): CreemKind | null {
  if (!o) return null;
  const pid = extractProductId(o);
  if (pid && GLOWUP_PRODUCT_ID && pid === GLOWUP_PRODUCT_ID) return "glowup";
  if (pid && PASS_PRODUCT_ID && pid === PASS_PRODUCT_ID) return "pass";
  // No product-id match (e.g. field shape differs) → trust the metadata echo.
  const meta = (o as { metadata?: { kind?: unknown } }).metadata;
  const mk = meta?.kind;
  if (mk === "glowup" || mk === "pass") return mk;
  return null;
}

function extractProductId(o: Record<string, unknown>): string {
  const any = o as Record<string, unknown> & {
    product_id?: string;
    product?: string | { id?: string };
    order?: { product_id?: string; product?: string | { id?: string } };
  };
  const fromProduct = (p: string | { id?: string } | undefined): string =>
    typeof p === "string" ? p : p?.id || "";
  return (
    any.product_id ||
    fromProduct(any.product) ||
    any.order?.product_id ||
    fromProduct(any.order?.product) ||
    ""
  );
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
