// BurntCV Pro — per-IP daily report metering.
//
// A Pro report is ~4 model calls, so the free allowance is tighter than the
// roast's. Counted once per report at the /decompose gate (the chain's entry
// point); the later stages ride burst limits only. Same atomic
// incr/revert-on-overshoot pattern as the Pass quotas. Durable with Upstash,
// best-effort in-memory without. This counter stores ONLY an IP hash key and a
// number — no résumé content, keeping Pro stateless where it matters.

import { getRedis } from "../redis";

const redis = getRedis();

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const PRO_FREE_PER_DAY = envInt("PRO_FREE_PER_DAY", 2);

const g = globalThis as unknown as {
  __burntProDay?: Map<string, { day: string; count: number }>;
};
const mem = g.__burntProDay ?? (g.__burntProDay = new Map());

const today = () => new Date().toISOString().slice(0, 10);
const keyFor = (ip: string) => `pro:day:${today()}:${ip}`;

export async function consumeProReport(
  ip: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const cap = PRO_FREE_PER_DAY;
  if (redis) {
    try {
      const key = keyFor(ip);
      const used = await redis.incr(key);
      if (used === 1) await redis.expire(key, 2 * 24 * 60 * 60);
      if (used > cap) {
        await redis.decr(key);
        return { allowed: false, remaining: 0 };
      }
      return { allowed: true, remaining: cap - used };
    } catch (err) {
      console.error("[pro:limits] redis error, failing open to memory:", err);
    }
  }
  const day = today();
  const e = mem.get(ip);
  const count = e && e.day === day ? e.count : 0;
  if (count >= cap) return { allowed: false, remaining: 0 };
  mem.set(ip, { day, count: count + 1 });
  return { allowed: true, remaining: cap - (count + 1) };
}

// Give the report back when the chain's first stage fails — a platform error
// must never burn one of the day's free reports.
export async function refundProReport(ip: string): Promise<void> {
  try {
    if (redis) {
      await redis.decr(keyFor(ip));
      return;
    }
    const e = mem.get(ip);
    if (e && e.day === today() && e.count > 0) {
      mem.set(ip, { day: e.day, count: e.count - 1 });
    }
  } catch {
    /* best-effort */
  }
}
