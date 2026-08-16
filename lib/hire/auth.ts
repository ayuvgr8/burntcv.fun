// BurntCV Hire — recruiter auth. Same HMAC-signed-token scheme as the roast
// Pass (lib/entitlements.ts), but a fully separate token type + secret scope:
// a Pass token can never open a Hire session and vice versa.
//
// Flow: email → magic link (Resend) → short-lived magic token → long-lived
// session token held client-side and sent as `Authorization: Bearer`. When
// email isn't configured (local dev) the request endpoint returns the link
// directly, clearly labeled as dev mode.

import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET =
  process.env.HIRE_SECRET ||
  process.env.ENTITLEMENT_SECRET ||
  process.env.RAZORPAY_KEY_SECRET ||
  "";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const hireAuthConfigured = !!SECRET;

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(body: string): string {
  return b64url(createHmac("sha256", SECRET).update(`hire.${body}`).digest());
}

function verifySig(body: string, sig: string): boolean {
  if (!SECRET) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- session tokens ----

export interface HireSession {
  t: "hire-sess";
  accountId: string;
  email: string;
  exp: number;
}

export function signSession(accountId: string, email: string): string {
  const claims: HireSession = {
    t: "hire-sess",
    accountId,
    email: email.toLowerCase().trim(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = b64url(JSON.stringify(claims));
  return `${body}.${sign(body)}`;
}

export function verifySession(token: string | null | undefined): HireSession | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !verifySig(body, sig)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as HireSession;
    if (claims.t !== "hire-sess") return null;
    if (typeof claims.exp !== "number" || claims.exp < Date.now()) return null;
    if (typeof claims.accountId !== "string" || typeof claims.email !== "string") return null;
    return claims;
  } catch {
    return null;
  }
}

// Pull the session off a request (Authorization: Bearer <token>).
export function sessionFrom(req: Request): HireSession | null {
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return verifySession(m?.[1]?.trim());
}

// ---- magic (sign-in link) tokens ----

interface MagicClaims {
  t: "hire-magic";
  email: string;
  orgName: string;
  exp: number;
}

export function signMagic(email: string, orgName: string): string {
  const claims: MagicClaims = {
    t: "hire-magic",
    email: email.toLowerCase().trim(),
    orgName: orgName.slice(0, 80),
    exp: Date.now() + MAGIC_TTL_MS,
  };
  const body = b64url(JSON.stringify(claims));
  return `${body}.${sign(body)}`;
}

export function verifyMagic(
  token: string | null | undefined,
): { email: string; orgName: string } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !verifySig(body, sig)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as MagicClaims;
    if (claims.t !== "hire-magic") return null;
    if (typeof claims.exp !== "number" || claims.exp < Date.now()) return null;
    if (typeof claims.email !== "string" || !claims.email) return null;
    return { email: claims.email, orgName: claims.orgName || "" };
  } catch {
    return null;
  }
}
