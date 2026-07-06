"use client";

// Payment layer. Razorpay-ready, with a clean simulated fallback so the whole
// pay-to-roast flow works today and goes live the moment you add keys.
//
// To go LIVE with real ₹7 / ₹49 / ₹199 charges, set:
//   NEXT_PUBLIC_RAZORPAY_KEY_ID   (client — enables the real checkout)
//   RAZORPAY_KEY_SECRET           (server — signs & verifies orders)
// Without NEXT_PUBLIC_RAZORPAY_KEY_ID the app simulates a successful purchase.

export type Plan = "single" | "topup" | "glowup" | "lifetime";

export const PRICES: Record<Plan, { rupees: number; label: string }> = {
  single: { rupees: 7, label: "One roast" }, // free user, past their freebie
  topup: { rupees: 5, label: "Extra roast" }, // lifetime user, past today's 5
  glowup: { rupees: 49, label: "The Glow-Up rewrite" }, // 4 free on the Pass, then ₹49
  lifetime: { rupees: 199, label: "6-Month Pass · 5/day + 4 Glow-Ups" },
};

export interface PassEntitlement {
  code: string;
  passUntil: number;
  token: string;
  glowupsLeft?: number; // Glow-Up rewrites remaining on this Pass
}

export interface PurchaseResult {
  ok: boolean;
  simulated: boolean;
  pass?: PassEntitlement | null; // present for a verified Pass purchase
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
}
interface RazorpayCtor {
  new (options: Record<string, unknown>): RazorpayInstance;
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const w = window as unknown as { Razorpay?: RazorpayCtor };
    if (w.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export async function purchase(plan: Plan): Promise<PurchaseResult> {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  // No public key configured → simulate the purchase (demo mode).
  if (!keyId) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, simulated: true };
  }

  // Create an order server-side.
  let order: {
    orderId?: string;
    amount?: number;
    currency?: string;
    simulated?: boolean;
    error?: string;
  };
  try {
    const res = await fetch("/api/payment/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    order = await res.json();
  } catch {
    return { ok: false, simulated: false };
  }

  // ONLY simulate when the server explicitly has no keys configured (demo mode).
  if (order.simulated) {
    return { ok: true, simulated: true };
  }
  // Keys are configured but the order failed (expired/invalid keys, Razorpay
  // down, etc.) → surface a real failure. NEVER silently grant a free unlock.
  if (!order.orderId) {
    console.error("[payment] order creation failed:", order.error);
    return { ok: false, simulated: false };
  }

  const ready = await loadRazorpay();
  if (!ready) return { ok: false, simulated: false };

  return new Promise<PurchaseResult>((resolve) => {
    const w = window as unknown as { Razorpay: RazorpayCtor };
    const rzp = new w.Razorpay({
      key: keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency ?? "INR",
      name: "BurntCV",
      description: PRICES[plan].label,
      theme: { color: "#ed3237" },
      handler: async (resp: Record<string, string>) => {
        try {
          const v = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...resp, plan }),
          });
          const data = await v.json();
          resolve({ ok: !!data.ok, simulated: false, pass: data.pass ?? null });
        } catch {
          resolve({ ok: false, simulated: false });
        }
      },
      modal: { ondismiss: () => resolve({ ok: false, simulated: false }) },
    });
    // Razorpay fires this when a payment attempt fails (declined card, etc.).
    rzp.on("payment.failed", (resp: unknown) => {
      const err = (resp as { error?: { description?: string } })?.error;
      console.error("[payment] failed:", err?.description ?? resp);
      resolve({ ok: false, simulated: false });
    });
    rzp.open();
  });
}

// Restore a Pass on a new device via the restore code or the paid email.
export async function restoreEntitlement(input: {
  code?: string;
  email?: string;
}): Promise<PassEntitlement | null> {
  try {
    const res = await fetch("/api/entitlement/restore", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.pass as PassEntitlement) ?? null;
  } catch {
    return null;
  }
}

// ── International (Creem) — the $7.20 Pass for the rest of the world ──────────

// Which payment rail to show: India → Razorpay, everyone else → Creem.
// Fails open to international (Creem) so foreigners never get UPI-only.
export async function fetchRegion(): Promise<"IN" | "INTL"> {
  try {
    const res = await fetch("/api/geo");
    const data = await res.json();
    return data?.india ? "IN" : "INTL";
  } catch {
    return "INTL";
  }
}

export type CreemKind = "pass" | "glowup" | "glowup_topup";

// Start a Creem hosted checkout → redirects the browser to Creem. `kind` picks
// the product: the $9.99 Pass, the $4.99 one-off Glow-Up, or the $3.99 Glow-Up
// top-up (a Pass holder's 5th+). On success Creem returns to
// /?creem=success&kind=…&checkout_id=…
export async function startCreemCheckout(kind: CreemKind = "pass"): Promise<boolean> {
  try {
    const res = await fetch("/api/creem/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface CreemClaim {
  ok: boolean;
  kind?: CreemKind; // server-verified product that was actually paid for
  pass?: PassEntitlement | null; // present only for a Pass purchase
}

// On return from Creem, confirm payment server-side. The server re-verifies the
// product, so the returned `kind` is authoritative: "pass" comes with a minted
// entitlement; "glowup" means the client should run the one-off Glow-Up.
export async function claimCreem(checkoutId: string): Promise<CreemClaim> {
  try {
    const res = await fetch("/api/creem/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checkoutId }),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return {
      ok: !!data.ok,
      kind: data.kind as CreemKind | undefined,
      pass: (data.pass as PassEntitlement) ?? null,
    };
  } catch {
    return { ok: false };
  }
}
