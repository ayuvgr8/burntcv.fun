// Tiered, fully-configurable rate limiting to protect API spend and sensitive
// endpoints (PRD §9 — "the value unit is an LLM call"). Uses Upstash Redis when
// configured (durable + distributed across serverless instances), and degrades
// gracefully to a best-effort in-memory limiter when the env vars are absent
// (e.g. local dev). Every limiter NEVER takes the app down: on an Upstash error
// it fails open to the in-memory path.
//
// Three tiers, mapped to endpoint sensitivity:
//   • AUTH   (strict)   — account-recovery routes. Per-IP AND per-account
//                         sliding windows + exponential backoff on repeated
//                         failures (a growing cooldown, not a hard lockout).
//   • PUBLIC (moderate) — unauthenticated POST/GET endpoints.
//   • USER   (loose)    — authenticated (Pass-holder) actions; a burst ceiling.
//
// Enable durable limiting by setting in your Vercel/Env:
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_* pair)
//
// EVERY threshold below is configurable via env — nothing is hardcoded.

import { Ratelimit } from "@upstash/ratelimit";
import { createHash } from "node:crypto";
import { getRedis } from "./redis";

// ── config helpers ───────────────────────────────────────────────────
type Window = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

function num(v: string | undefined, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function win(v: string | undefined, def: Window): Window {
  return v && /^\d+\s+(ms|s|m|h|d)$/.test(v.trim()) ? (v.trim() as Window) : def;
}

function windowMs(w: Window): number {
  const m = /^(\d+)\s+(ms|s|m|h|d)$/.exec(w)!;
  const n = Number(m[1]);
  const mult =
    m[2] === "ms" ? 1 : m[2] === "s" ? 1e3 : m[2] === "m" ? 60e3 : m[2] === "h" ? 3600e3 : 86400e3;
  return n * mult;
}

// Hash secret-ish identifiers (restore codes, emails) so they never land in a
// Redis key or log in plaintext.
function hashId(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 24);
}

// ── config (all env-overridable) ─────────────────────────────────────
// Roast/free tier (unchanged): per-IP daily ceiling on the platform LLM key.
const FREE_ROASTS_PER_DAY = num(process.env.FREE_ROASTS_PER_DAY, 5);

// Feedback (unchanged): public POST, capped so it can't spam the inbox.
const FEEDBACK_PER_HOUR = num(process.env.FEEDBACK_PER_HOUR, 5);

// Auth tier — strict. Per-IP window is the coarse ceiling; per-account window
// stops one account being hammered from many IPs. `RESTORE_PER_HOUR` is kept as
// a back-compat alias for the per-IP window count.
const AUTH_IP_MAX = num(process.env.RL_AUTH_IP_MAX ?? process.env.RESTORE_PER_HOUR, 20);
const AUTH_IP_WINDOW = win(process.env.RL_AUTH_IP_WINDOW, "1 h");
const AUTH_ACCOUNT_MAX = num(process.env.RL_AUTH_ACCOUNT_MAX, 5);
const AUTH_ACCOUNT_WINDOW = win(process.env.RL_AUTH_ACCOUNT_WINDOW, "1 h");
// Exponential backoff: after THRESHOLD consecutive failures, each further
// failure imposes a cooldown of BASE_MS * 2^(fails-THRESHOLD), capped at MAX_MS.
const AUTH_BACKOFF_THRESHOLD = num(process.env.RL_AUTH_BACKOFF_THRESHOLD, 3);
const AUTH_BACKOFF_BASE_MS = num(process.env.RL_AUTH_BACKOFF_BASE_MS, 1000);
const AUTH_BACKOFF_MAX_MS = num(process.env.RL_AUTH_BACKOFF_MAX_MS, 15 * 60 * 1000);
const AUTH_BACKOFF_TTL_MS = num(process.env.RL_AUTH_BACKOFF_TTL_MS, 60 * 60 * 1000);

// Public tier — moderate per-IP burst ceiling.
const PUBLIC_MAX = num(process.env.RL_PUBLIC_MAX, 30);
const PUBLIC_WINDOW = win(process.env.RL_PUBLIC_WINDOW, "1 m");

// User tier — loose burst ceiling for authenticated (Pass) actions.
const USER_MAX = num(process.env.RL_USER_MAX, 120);
const USER_WINDOW = win(process.env.RL_USER_WINDOW, "1 m");

const redis = getRedis();

export type LimitResult = { allowed: boolean; remaining: number; retryAfter: number };

// ── generic sliding-window limiter (Upstash + in-memory fallback) ────
type MemWin = { reset: number; count: number };
const memStore = new Map<string, MemWin>();

function memWindow(key: string, max: number, wMs: number): LimitResult {
  const now = Date.now();
  const e = memStore.get(key);
  if (!e || e.reset <= now) {
    memStore.set(key, { reset: now + wMs, count: 1 });
    return { allowed: true, remaining: max - 1, retryAfter: 0 };
  }
  if (e.count >= max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((e.reset - now) / 1000) };
  }
  e.count += 1;
  return { allowed: true, remaining: max - e.count, retryAfter: 0 };
}

function makeLimiter(max: number, window: Window, prefix: string) {
  const upstash = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, window),
        prefix,
        analytics: false,
      })
    : null;
  const wMs = windowMs(window);
  return async (id: string): Promise<LimitResult> => {
    if (upstash) {
      try {
        const r = await upstash.limit(id);
        return {
          allowed: r.success,
          remaining: r.remaining,
          retryAfter: r.success ? 0 : Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
        };
      } catch (err) {
        console.error(`[ratelimit] ${prefix} upstash error, falling back to memory:`, err);
      }
    }
    return memWindow(`${prefix}:${id}`, max, wMs);
  };
}

// ── exponential-backoff store (per identity) ─────────────────────────
// Tracks consecutive failures and the timestamp of the next permitted attempt.
// This is a BACKOFF, never a lockout: the wait grows but is always finite, and a
// single success clears it.
type MemBackoff = { fails: number; next: number };
const memBackoff = new Map<string, MemBackoff>();

async function backoffState(key: string): Promise<{ fails: number; next: number }> {
  if (redis) {
    try {
      const [fails, next] = await Promise.all([
        redis.get<string>(`bo:f:${key}`),
        redis.get<string>(`bo:n:${key}`),
      ]);
      return { fails: fails ? parseInt(fails, 10) || 0 : 0, next: next ? parseInt(next, 10) || 0 : 0 };
    } catch (err) {
      console.error(`[ratelimit] backoff read error, falling back:`, err);
    }
  }
  const e = memBackoff.get(key);
  return e ? { fails: e.fails, next: e.next } : { fails: 0, next: 0 };
}

async function checkBackoff(key: string): Promise<LimitResult> {
  const { next } = await backoffState(key);
  const now = Date.now();
  if (next > now) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((next - now) / 1000) };
  }
  return { allowed: true, remaining: 0, retryAfter: 0 };
}

async function recordFailure(key: string): Promise<void> {
  const { fails } = await backoffState(key);
  const nextFails = fails + 1;
  const over = nextFails - AUTH_BACKOFF_THRESHOLD;
  const waitMs =
    over > 0 ? Math.min(AUTH_BACKOFF_BASE_MS * 2 ** (over - 1), AUTH_BACKOFF_MAX_MS) : 0;
  const next = Date.now() + waitMs;
  const ttlSec = Math.ceil(AUTH_BACKOFF_TTL_MS / 1000);
  if (redis) {
    try {
      await Promise.all([
        redis.set(`bo:f:${key}`, String(nextFails), { ex: ttlSec }),
        redis.set(`bo:n:${key}`, String(next), { ex: ttlSec }),
      ]);
      return;
    } catch (err) {
      console.error(`[ratelimit] backoff write error, falling back:`, err);
    }
  }
  memBackoff.set(key, { fails: nextFails, next });
}

async function recordSuccessKey(key: string): Promise<void> {
  if (redis) {
    try {
      await Promise.all([redis.del(`bo:f:${key}`), redis.del(`bo:n:${key}`)]);
      return;
    } catch (err) {
      console.error(`[ratelimit] backoff clear error, falling back:`, err);
    }
  }
  memBackoff.delete(key);
}

// Standard 429 response with a Retry-After header, so clients can back off
// correctly. Returns a plain Response (compatible with Next route handlers).
export function rateLimitedResponse(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: "rate_limited", retryAfter }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(retryAfter) },
  });
}

// ── request IP extraction ────────────────────────────────────────────
export function ipFrom(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// ── AUTH tier (strict): per-IP + per-account window + backoff ────────
const authIpLimiter = makeLimiter(AUTH_IP_MAX, AUTH_IP_WINDOW, "burntcv:auth:ip");
const authAccountLimiter = makeLimiter(AUTH_ACCOUNT_MAX, AUTH_ACCOUNT_WINDOW, "burntcv:auth:acct");

export type AuthLimitResult = {
  allowed: boolean;
  retryAfter: number;
  reason: "ok" | "ip_rate" | "account_rate" | "backoff_ip" | "backoff_account";
};

// Gate a sensitive (auth-analog) attempt. Consumes one per-IP token and, when an
// account identifier is known, one per-account token; then enforces any active
// exponential-backoff cooldown for either identity. Call recordAuthFailure /
// recordAuthSuccess afterwards based on whether the credential checked out.
export async function limitAuth(args: { ip: string; account?: string }): Promise<AuthLimitResult> {
  const acct = args.account ? hashId(args.account) : "";

  const ipWin = await authIpLimiter(args.ip);
  if (!ipWin.allowed) return { allowed: false, retryAfter: ipWin.retryAfter, reason: "ip_rate" };

  if (acct) {
    const acctWin = await authAccountLimiter(acct);
    if (!acctWin.allowed)
      return { allowed: false, retryAfter: acctWin.retryAfter, reason: "account_rate" };
  }

  const boIp = await checkBackoff(`ip:${args.ip}`);
  if (!boIp.allowed) return { allowed: false, retryAfter: boIp.retryAfter, reason: "backoff_ip" };

  if (acct) {
    const boAcct = await checkBackoff(`acct:${acct}`);
    if (!boAcct.allowed)
      return { allowed: false, retryAfter: boAcct.retryAfter, reason: "backoff_account" };
  }

  return { allowed: true, retryAfter: 0, reason: "ok" };
}

// A failed credential check → ratchet the backoff for both identities.
export async function recordAuthFailure(args: { ip: string; account?: string }): Promise<void> {
  await recordFailure(`ip:${args.ip}`);
  if (args.account) await recordFailure(`acct:${hashId(args.account)}`);
}

// A successful check → clear the backoff for both identities.
export async function recordAuthSuccess(args: { ip: string; account?: string }): Promise<void> {
  await recordSuccessKey(`ip:${args.ip}`);
  if (args.account) await recordSuccessKey(`acct:${hashId(args.account)}`);
}

// ── PUBLIC tier (moderate) ───────────────────────────────────────────
const publicLimiter = makeLimiter(PUBLIC_MAX, PUBLIC_WINDOW, "burntcv:public");

// Moderate per-IP ceiling for unauthenticated endpoints. `bucket` isolates a
// route's counter from others (so e.g. /extract and /geo don't share a budget).
export function limitPublic(ip: string, bucket = ""): Promise<LimitResult> {
  return publicLimiter(bucket ? `${bucket}:${ip}` : ip);
}

// ── USER tier (loose) ────────────────────────────────────────────────
const userLimiter = makeLimiter(USER_MAX, USER_WINDOW, "burntcv:user");

// Loose burst ceiling for authenticated actions, keyed on the account identity
// (e.g. a Pass code). Never trips for a real human; stops a leaked/shared
// credential from being scripted.
export function limitUser(id: string, bucket = ""): Promise<LimitResult> {
  return userLimiter(bucket ? `${bucket}:${hashId(id)}` : hashId(id));
}

// ── roast/free daily limiter (unchanged behaviour) ───────────────────
const upstashLimiter = redis
  ? new Ratelimit({
      redis,
      // Fixed window aligned to a calendar day, keyed per-IP.
      limiter: Ratelimit.fixedWindow(FREE_ROASTS_PER_DAY, "1 d"),
      prefix: "burntcv:roast",
      analytics: false,
    })
  : null;

type Entry = { day: string; count: number };
const memHits = new Map<string, Entry>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function memCheck(ip: string): { allowed: boolean; remaining: number } {
  const day = today();
  const entry = memHits.get(ip);
  const count = entry && entry.day === day ? entry.count : 0;
  if (count >= FREE_ROASTS_PER_DAY) return { allowed: false, remaining: 0 };
  memHits.set(ip, { day, count: count + 1 });
  return { allowed: true, remaining: FREE_ROASTS_PER_DAY - (count + 1) };
}

export async function checkAndIncrement(
  ip: string,
): Promise<{ allowed: boolean; remaining: number }> {
  if (upstashLimiter) {
    try {
      const { success, remaining } = await upstashLimiter.limit(ip);
      return { allowed: success, remaining };
    } catch (err) {
      // Never let a limiter outage take down roasting — fail open to memory.
      console.error("[ratelimit] upstash error, falling back to memory:", err);
      return memCheck(ip);
    }
  }
  return memCheck(ip);
}

// ── feedback limiter (unchanged behaviour) ───────────────────────────
const feedbackLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(FEEDBACK_PER_HOUR, "1 h"),
      prefix: "burntcv:feedback",
      analytics: false,
    })
  : null;
type Hourly = { hour: number; count: number };
const memFeedback = new Map<string, Hourly>();

function memFeedbackCheck(ip: string): boolean {
  const hour = Math.floor(Date.now() / 3_600_000);
  const e = memFeedback.get(ip);
  const count = e && e.hour === hour ? e.count : 0;
  if (count >= FEEDBACK_PER_HOUR) return false;
  memFeedback.set(ip, { hour, count: count + 1 });
  return true;
}

// Returns false when this IP has exceeded the feedback budget this hour.
export async function checkFeedback(ip: string): Promise<boolean> {
  if (feedbackLimiter) {
    try {
      const { success } = await feedbackLimiter.limit(ip);
      return success;
    } catch (err) {
      console.error("[ratelimit] feedback upstash error, falling back:", err);
      return memFeedbackCheck(ip);
    }
  }
  return memFeedbackCheck(ip);
}

export const usingDurableRateLimit = !!redis;
