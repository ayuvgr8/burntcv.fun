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
import {
  PASS_MS,
  GLOWUPS_PER_PASS,
  ROASTS_PER_DAY,
  INTL_PASS_ROAST_CAP,
} from "./plan";

// A Pass is sold on one of two rails, which decide its roast allowance:
//   • "IN"   (Razorpay) → 5 roasts/day for 6 months.
//   • "INTL" (Creem)    → 400 roasts total across the 6 months.
export type PassRegion = "IN" | "INTL";

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

// ---- Pass Glow-Up quota ----
// Each Pass includes GLOWUPS_PER_PASS free Glow-Ups. We track how many have
// been used with a counter keyed by the Pass code, so the quota can't be reset
// by clearing the browser (the signed token proves which Pass is asking).
const glowKey = (code: string) => `ent:glowused:${code}`;

export async function passGlowupsLeft(code: string): Promise<number> {
  const raw = await kvGet(glowKey(code));
  const used = raw ? parseInt(raw, 10) || 0 : 0;
  return Math.max(0, GLOWUPS_PER_PASS - used);
}

// Atomically consume one Pass Glow-Up credit. Returns the number remaining
// AFTER this consume, or -1 if the Pass is already exhausted (caller should
// then charge ₹49 instead). Reverts the increment on overshoot so a burst of
// requests can't inflate the counter past the cap.
export async function consumePassGlowup(code: string): Promise<number> {
  const key = glowKey(code);
  let used: number;
  if (redis) {
    used = await redis.incr(key);
    if (used === 1) await redis.expire(key, TTL_SECONDS);
    if (used > GLOWUPS_PER_PASS) {
      await redis.decr(key);
      return -1;
    }
  } else {
    used = Number((await kvGet(key)) || 0) + 1;
    if (used > GLOWUPS_PER_PASS) return -1;
    await kvSet(key, String(used));
  }
  return GLOWUPS_PER_PASS - used;
}

// ---- Pass roast quota (server-enforced, tamper-proof) ----
// The 5/day (India) and 400-total (International) caps are counted here, keyed by
// the Pass code, so they can't be reset by editing browser storage. The signed
// token proves which Pass — and which region's cap — is asking.
//   • IN   → daily counter `ent:roastday:<code>:<UTC-date>`, cap ROASTS_PER_DAY,
//            short TTL (rolls over each day).
//   • INTL → lifetime counter `ent:roasttot:<code>`, cap INTL_PASS_ROAST_CAP,
//            Pass-lifetime TTL.
function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}
function roastKey(code: string, region: PassRegion): string {
  return region === "INTL"
    ? `ent:roasttot:${code}`
    : `ent:roastday:${code}:${utcDate()}`;
}
function roastCapFor(region: PassRegion): number {
  return region === "INTL" ? INTL_PASS_ROAST_CAP : ROASTS_PER_DAY;
}

export interface RoastConsume {
  allowed: boolean;
  remaining: number; // roasts left AFTER this one (0 when denied)
}

// Atomically consume one Pass roast. Reverts the increment on overshoot so a
// burst of concurrent requests can't push the counter past the cap.
export async function consumePassRoast(
  code: string,
  region: PassRegion,
): Promise<RoastConsume> {
  const key = roastKey(code, region);
  const cap = roastCapFor(region);
  const ttl = region === "INTL" ? TTL_SECONDS : 2 * 24 * 60 * 60; // daily: ~2 days
  let used: number;
  if (redis) {
    used = await redis.incr(key);
    if (used === 1) await redis.expire(key, ttl);
    if (used > cap) {
      await redis.decr(key);
      return { allowed: false, remaining: 0 };
    }
  } else {
    used = Number((await kvGet(key)) || 0) + 1;
    if (used > cap) return { allowed: false, remaining: 0 };
    // Best-effort in-memory: the daily key is date-stamped so it naturally stops
    // matching once the day rolls over; the total key rides the Pass TTL.
    mem.set(key, { v: String(used), exp: Date.now() + ttl * 1000 });
  }
  return { allowed: true, remaining: cap - used };
}

// Give a consumed roast back — used when the roast fails AFTER we've counted it,
// so a platform outage never silently burns a paid roast.
export async function refundPassRoast(
  code: string,
  region: PassRegion,
): Promise<void> {
  const key = roastKey(code, region);
  try {
    if (redis) {
      await redis.decr(key);
    } else {
      const cur = Number((await kvGet(key)) || 0);
      if (cur > 0) mem.set(key, { v: String(cur - 1), exp: Date.now() + TTL_SECONDS * 1000 });
    }
  } catch {
    /* best-effort */
  }
}

// Read-only remaining count (no consume).
export async function passRoastsLeft(
  code: string,
  region: PassRegion,
): Promise<number> {
  const raw = await kvGet(roastKey(code, region));
  const used = raw ? parseInt(raw, 10) || 0 : 0;
  return Math.max(0, roastCapFor(region) - used);
}

// ---- signed token ----
// NOTE: the token is HMAC-signed (tamper-proof) but NOT encrypted — the body is
// readable base64. So it carries only non-sensitive claims: the Pass code,
// expiry, and region (which cap applies). The buyer's email is never embedded
// (it lives only in Redis, indexed for restore).
export interface PassClaims {
  t: "pass";
  passUntil: number;
  code: string;
  region?: PassRegion; // absent on legacy tokens → treated as "IN"
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
  region?: PassRegion; // absent on legacy records → treated as "IN"
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

export interface PassResult {
  code: string;
  passUntil: number;
  token: string;
  glowupsLeft: number;
}

async function buildPassResult(rec: PassRecord): Promise<PassResult> {
  return {
    code: rec.code,
    passUntil: rec.passUntil,
    token: signToken({
      t: "pass",
      passUntil: rec.passUntil,
      code: rec.code,
      region: rec.region ?? "IN",
    }),
    glowupsLeft: await passGlowupsLeft(rec.code),
  };
}

// Idempotent per order — safe to call from both verify/claim and the webhook.
// `region` fixes which roast cap the Pass carries: "IN" (Razorpay, 5/day) or
// "INTL" (Creem, 400 total). Existing passes keep their stored region.
export async function ensurePassForOrder(args: {
  orderId: string;
  email: string;
  region?: PassRegion;
}): Promise<PassResult> {
  const existingCode = await kvGet(`ent:order:${args.orderId}`);
  if (existingCode) {
    const raw = await kvGet(`ent:code:${existingCode}`);
    if (raw) {
      return buildPassResult(JSON.parse(raw) as PassRecord);
    }
  }
  const rec: PassRecord = {
    plan: "pass",
    email: args.email || "",
    passUntil: Date.now() + PASS_MS,
    code: genCode(),
    orderId: args.orderId,
    createdAt: Date.now(),
    region: args.region ?? "IN",
  };
  await saveRecord(rec);
  return buildPassResult(rec);
}

// Restore by the SECRET restore code only. Email-only restore is intentionally
// disabled: emails aren't secret, so returning a token to whoever types an email
// is Pass theft. The `email` arg is accepted for API compatibility but ignored;
// email alone can't restore. (The email→code index is still written on purchase
// for a future magic-link flow, where recovery goes TO the mailbox owner.)
export async function restorePass(args: {
  code?: string;
  email?: string;
}): Promise<PassResult | null> {
  const code = args.code?.trim().toUpperCase();
  if (!code) return null;
  const raw = await kvGet(`ent:code:${code}`);
  if (!raw) return null;
  const rec = JSON.parse(raw) as PassRecord;
  if (rec.passUntil < Date.now()) return null; // expired
  return buildPassResult(rec);
}
