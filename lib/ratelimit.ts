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

export const usingDurableRateLimit = !!upstashLimiter;
