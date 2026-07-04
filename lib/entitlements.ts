// Server-side entitlements for the 6-month Pass (PRD §12).
//
// A paid Pass must survive browser-clear / device-switch, so we store it
// durably (Upstash Redis) keyed by a secret restore code + the paying email,
// and hand the client a tamper-proof HMAC-signed token. Single/top-up roasts
// are one-off (pay-then-roast-now) and need no persistence.
//
// Requires (for real durability):
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// Signing secret: ENTITLEMENT_SECRET (falls back to RAZORPAY_KEY_SECRET).

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getRedis, hasRedis } from "./redis";
import { PASS_MS } from "./plan";

const SECRET =
  process.env.ENTITLEMENT_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
const TTL_SECONDS = Math.ceil(PASS_MS / 1000) + 14 * 24 * 60 * 60; // pass + grace

const redis = getRedis();

export const durableEntitlements = hasRedis;

// ---- tiny KV abstraction (Upstash, else best-effort in-memory) ----
// Pin the fallback map to globalThis so it's shared across route bundles in a
// single process (dev) and survives HMR. Real durability still needs Upstash.
const g = globalThis as unknown as {
  __burntEnt?: Map<string, { v: string; exp: number }>;
};
const mem = g.__burntEnt ?? (g.__burntEnt = new Map());

async function kvSet(key: string, val: string): Promise<void> {
  if (redis) {
    await redis.set(key, val, { ex: TTL_SECONDS });
    return;
  }
  mem.set(key, { v: val, exp: Date.now() + TTL_SECONDS * 1000 });
}
async function kvGet(key: string): Promise<string | null> {
  if (redis) return (await redis.get<string>(key)) ?? null;
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.v;
}

// ---- signed token ----
export interface PassClaims {
  t: "pass";
  passUntil: number;
  email: string;
  code: string;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signToken(claims: PassClaims): string {
  const body = b64url(JSON.stringify(claims));
  const sig = b64url(createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null): PassClaims | null {
  if (!token || !SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(createHmac("sha256", SECRET).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as PassClaims;
    if (claims.t !== "pass" || typeof claims.passUntil !== "number") return null;
    if (claims.passUntil < Date.now()) return null; // expired
    return claims;
  } catch {
    return null;
  }
}

// ---- entitlement records ----
export interface PassRecord {
  plan: "pass";
  email: string;
  passUntil: number;
  code: string;
  orderId: string;
  createdAt: number;
}

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const raw = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[raw[i] % alphabet.length];
  return `BURNT-${out.slice(0, 4)}-${out.slice(4)}`;
}

async function saveRecord(rec: PassRecord): Promise<void> {
  await kvSet(`ent:code:${rec.code}`, JSON.stringify(rec));
  if (rec.email) await kvSet(`ent:email:${rec.email.toLowerCase()}`, rec.code);
  await kvSet(`ent:order:${rec.orderId}`, rec.code);
}

// Idempotent per Razorpay order — safe to call from both verify and webhook.
export async function ensurePassForOrder(args: {
  orderId: string;
  email: string;
}): Promise<{ code: string; passUntil: number; token: string }> {
  const existingCode = await kvGet(`ent:order:${args.orderId}`);
  if (existingCode) {
    const raw = await kvGet(`ent:code:${existingCode}`);
    if (raw) {
      const rec = JSON.parse(raw) as PassRecord;
      return {
        code: rec.code,
        passUntil: rec.passUntil,
        token: signToken({ t: "pass", passUntil: rec.passUntil, email: rec.email, code: rec.code }),
      };
    }
  }
  const rec: PassRecord = {
    plan: "pass",
    email: args.email || "",
    passUntil: Date.now() + PASS_MS,
    code: genCode(),
    orderId: args.orderId,
    createdAt: Date.now(),
  };
  await saveRecord(rec);
  return {
    code: rec.code,
    passUntil: rec.passUntil,
    token: signToken({ t: "pass", passUntil: rec.passUntil, email: rec.email, code: rec.code }),
  };
}

// Restore by code or email → returns a fresh token for this device.
export async function restorePass(args: {
  code?: string;
  email?: string;
}): Promise<{ code: string; passUntil: number; token: string } | null> {
  let code = args.code?.trim().toUpperCase();
  if (!code && args.email) {
    code = (await kvGet(`ent:email:${args.email.trim().toLowerCase()}`)) ?? undefined;
  }
  if (!code) return null;
  const raw = await kvGet(`ent:code:${code}`);
  if (!raw) return null;
  const rec = JSON.parse(raw) as PassRecord;
  if (rec.passUntil < Date.now()) return null; // expired
  return {
    code: rec.code,
    passUntil: rec.passUntil,
    token: signToken({ t: "pass", passUntil: rec.passUntil, email: rec.email, code: rec.code }),
  };
}
