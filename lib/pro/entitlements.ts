// BurntCV Pro — paid entitlements: match credits + the 7-day sprint pass.
//
// Pricing shape per docs/pro.md (decided): pay-per-use, never monthly.
//   pro_single  ₹49  → 1 match credit
//   pro_pack    ₹149 → 5 match credits
//   pro_pass    ₹299 → 7 days unlimited (burst-limited, not metered)
// Amounts are env-overridable (working anchors until final pricing).
//
// Storage holds ONLY billing state — a secret code, a credit counter, an
// expiry, the paying email for future recovery. Never any résumé or report
// content; the product itself stays stateless. Same HMAC-token + secret-code
// pattern as the roast Pass (lib/entitlements.ts), separate token type and
// keyspace so the two can never cross.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getRedis } from "../redis";

const SECRET =
  process.env.PRO_SECRET ||
  process.env.ENTITLEMENT_SECRET ||
  process.env.RAZORPAY_KEY_SECRET ||
  "";

const redis = getRedis();

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export type ProPlan = "pro_single" | "pro_pack" | "pro_pass";

export const PRO_PLANS: Record<
  ProPlan,
  { paise: number; credits: number; passDays: number; label: string }
> = {
  pro_single: {
    paise: envInt("PRO_SINGLE_PAISE", 4900),
    credits: 1,
    passDays: 0,
    label: "1 match report",
  },
  pro_pack: {
    paise: envInt("PRO_PACK_PAISE", 14900),
    credits: envInt("PRO_PACK_CREDITS", 5),
    passDays: 0,
    label: "5 match reports",
  },
  pro_pass: {
    paise: envInt("PRO_PASS_PAISE", 29900),
    credits: 0,
    passDays: envInt("PRO_PASS_DAYS", 7),
    label: "7-day unlimited pass",
  },
};

export function isProPlan(plan: string | undefined | null): plan is ProPlan {
  return plan === "pro_single" || plan === "pro_pack" || plan === "pro_pass";
}

// Credits shouldn't evaporate on a job-search timeline; a year is generous.
const RECORD_TTL_S = 366 * 24 * 60 * 60;

// ---- KV (Upstash, else shared in-memory fallback) ----
const g = globalThis as unknown as {
  __burntProEnt?: Map<string, { v: string; exp: number }>;
};
const mem = g.__burntProEnt ?? (g.__burntProEnt = new Map());

async function kvSet(key: string, val: string, ttl = RECORD_TTL_S): Promise<void> {
  if (redis) {
    await redis.set(key, val, { ex: ttl });
    return;
  }
  mem.set(key, { v: val, exp: Date.now() + ttl * 1000 });
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

const kEnt = (code: string) => `pro:ent:${code}`;
const kCredits = (code: string) => `pro:credits:${code}`;
const kOrder = (orderId: string) => `pro:order:${orderId}`;

// ---- records ----

export interface ProRecord {
  code: string;
  plan: ProPlan;
  passUntil: number; // 0 for credit plans
  email: string;
  orderId: string;
  createdAt: number;
}

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const raw = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[raw[i] % alphabet.length];
  return `PRO-${out.slice(0, 4)}-${out.slice(4)}`;
}

// ---- signed token (proves code ownership without a lookup) ----

export interface ProClaims {
  t: "pro";
  code: string;
  plan: ProPlan;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}
function sign(body: string): string {
  return b64url(createHmac("sha256", SECRET).update(`pro.${body}`).digest());
}

export function signProToken(rec: ProRecord): string {
  const claims: ProClaims = {
    t: "pro",
    code: rec.code,
    plan: rec.plan,
    // Pass tokens die with the pass; credit tokens ride the record TTL — the
    // server-side counter is the source of truth for what's left.
    exp: rec.passUntil > 0 ? rec.passUntil : rec.createdAt + RECORD_TTL_S * 1000,
  };
  const body = b64url(JSON.stringify(claims));
  return `${body}.${sign(body)}`;
}

export function verifyProToken(token: string | null | undefined): ProClaims | null {
  if (!token || !SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as ProClaims;
    if (claims.t !== "pro" || typeof claims.exp !== "number") return null;
    if (claims.exp < Date.now()) return null;
    if (typeof claims.code !== "string" || !isProPlan(claims.plan)) return null;
    return claims;
  } catch {
    return null;
  }
}

// ---- mint (idempotent per order — safe from both verify and webhook) ----

export interface ProStatus {
  code: string;
  plan: ProPlan;
  creditsLeft: number;
  passUntil: number; // 0 when not a pass
  token: string;
}

export async function statusFor(rec: ProRecord): Promise<ProStatus> {
  return {
    code: rec.code,
    plan: rec.plan,
    creditsLeft: await creditsLeft(rec.code),
    passUntil: rec.passUntil,
    token: signProToken(rec),
  };
}

export async function getProRecord(code: string): Promise<ProRecord | null> {
  const raw = await kvGet(kEnt(code));
  return raw ? (JSON.parse(raw) as ProRecord) : null;
}

export async function ensureProForOrder(args: {
  orderId: string;
  plan: ProPlan;
  email: string;
}): Promise<ProStatus> {
  const existing = await kvGet(kOrder(args.orderId));
  if (existing) {
    const rec = await getProRecord(existing);
    if (rec) return statusFor(rec);
  }
  const meta = PRO_PLANS[args.plan];
  const now = Date.now();
  const rec: ProRecord = {
    code: genCode(),
    plan: args.plan,
    passUntil: meta.passDays > 0 ? now + meta.passDays * 24 * 60 * 60 * 1000 : 0,
    email: args.email || "",
    orderId: args.orderId,
    createdAt: now,
  };
  await kvSet(kEnt(rec.code), JSON.stringify(rec));
  await kvSet(kOrder(args.orderId), rec.code);
  if (meta.credits > 0) {
    await kvSet(kCredits(rec.code), String(meta.credits));
  }
  console.log(`[pro:ent] minted ${args.plan} for order ${args.orderId}`);
  return statusFor(rec);
}

// ---- credits (atomic decr, revert on overshoot — same posture as the Pass) ----

export async function creditsLeft(code: string): Promise<number> {
  const raw = await kvGet(kCredits(code));
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export async function consumeProCredit(code: string): Promise<boolean> {
  if (redis) {
    const left = await redis.decr(kCredits(code));
    if (left < 0) {
      await redis.incr(kCredits(code));
      return false;
    }
    return true;
  }
  const left = await creditsLeft(code);
  if (left <= 0) return false;
  await kvSet(kCredits(code), String(left - 1));
  return true;
}

// Give a credit back when the report's first stage fails after we counted it.
export async function refundProCredit(code: string): Promise<void> {
  try {
    if (redis) {
      await redis.incr(kCredits(code));
      return;
    }
    await kvSet(kCredits(code), String((await creditsLeft(code)) + 1));
  } catch {
    /* best-effort */
  }
}

// ---- the gate the /api/pro routes use ----

export interface ProAccess {
  entitled: boolean; // pass active OR credits available (not yet consumed)
  viaPass: boolean;
  rec: ProRecord | null;
}

// Resolve a request's Pro token to live entitlement state. Signature check
// first (cheap), then the record — the counter/expiry server-side is always
// the source of truth.
export async function resolveProAccess(token: string | null | undefined): Promise<ProAccess> {
  const claims = verifyProToken(token);
  if (!claims) return { entitled: false, viaPass: false, rec: null };
  const rec = await getProRecord(claims.code);
  if (!rec) return { entitled: false, viaPass: false, rec: null };
  if (rec.passUntil > Date.now()) return { entitled: true, viaPass: true, rec };
  if ((await creditsLeft(rec.code)) > 0) return { entitled: true, viaPass: false, rec };
  return { entitled: false, viaPass: false, rec };
}

// Restore on a new device with the secret code (email-only restore is
// deliberately not offered — same reasoning as the roast Pass).
export async function restorePro(code: string): Promise<ProStatus | null> {
  const clean = code.trim().toUpperCase();
  if (!/^PRO-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(clean)) return null;
  const rec = await getProRecord(clean);
  if (!rec) return null;
  // A dead entitlement (expired pass AND no credits) restores to nothing.
  if (rec.passUntil <= Date.now() && (await creditsLeft(rec.code)) <= 0) return null;
  return statusFor(rec);
}
