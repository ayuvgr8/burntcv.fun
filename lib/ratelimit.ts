// Per-IP daily rate limit to protect API spend (PRD §9 — "the value unit is an
// LLM call"). Uses Upstash Redis when configured (durable + distributed across
// serverless instances), and degrades gracefully to a best-effort in-memory
// limiter when the env vars are absent (e.g. local dev).
//
// Enable durable limiting by setting in your Vercel/Env:
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_* pair)

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

const FREE_ROASTS_PER_DAY = Number(process.env.FREE_ROASTS_PER_DAY ?? 5);

// Lazily construct the Upstash limiter once (module scope survives warm invokes).
const redis = getRedis();
const upstashLimiter = redis
  ? new Ratelimit({
      redis,
      // Fixed window aligned to a calendar day, keyed per-IP.
      limiter: Ratelimit.fixedWindow(FREE_ROASTS_PER_DAY, "1 d"),
      prefix: "burntcv:roast",
      analytics: false,
    })
  : null;

// Separate, tighter limiter for the Pass-restore endpoint so it can't be used
// to fish for other people's Passes (esp. email restore, where the keyspace is
// small). Per-IP, and kept off the roast limiter so it never eats roast quota.
const RESTORE_PER_HOUR = Number(process.env.RESTORE_PER_HOUR ?? 20);
const restoreLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(RESTORE_PER_HOUR, "1 h"),
      prefix: "burntcv:restore",
      analytics: false,
    })
  : null;

// ---- in-memory fallback (per warm instance only) ----
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

export function ipFrom(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
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

// ---- restore endpoint limiter ----
type Hourly = { hour: number; count: number };
const memRestore = new Map<string, Hourly>();

function memRestoreCheck(ip: string): boolean {
  const hour = Math.floor(Date.now() / 3_600_000);
  const e = memRestore.get(ip);
  const count = e && e.hour === hour ? e.count : 0;
  if (count >= RESTORE_PER_HOUR) return false;
  memRestore.set(ip, { hour, count: count + 1 });
  return true;
}

// Returns false when this IP has exceeded the restore attempt budget this hour.
export async function checkRestore(ip: string): Promise<boolean> {
  if (restoreLimiter) {
    try {
      const { success } = await restoreLimiter.limit(ip);
      return success;
    } catch (err) {
      console.error("[ratelimit] restore upstash error, falling back:", err);
      return memRestoreCheck(ip);
    }
  }
  return memRestoreCheck(ip);
}

// ---- feedback endpoint limiter ----
// The feedback form is a public POST → cap submissions per IP so it can't be
// used to spam the inbox.
const FEEDBACK_PER_HOUR = Number(process.env.FEEDBACK_PER_HOUR ?? 5);
const feedbackLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(FEEDBACK_PER_HOUR, "1 h"),
      prefix: "burntcv:feedback",
      analytics: false,
    })
  : null;
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

export const usingDurableRateLimit = !!upstashLimiter;
