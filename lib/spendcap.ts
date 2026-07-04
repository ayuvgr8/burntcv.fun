// Global daily spend cap on the PLATFORM Anthropic key (PRD §9 — "cost control
// matters since the value unit is an LLM call").
//
// The per-IP rate limiter (lib/ratelimit.ts) caps any single abuser, but it can
// be defeated by IP rotation, and it does nothing against an organic viral
// spike. This is the catastrophe backstop: it caps TOTAL platform-key spend per
// UTC day so nothing — abuse or virality — can run up an unbounded Anthropic
// bill. When the day's budget is exhausted the platform key stops serving and
// the app steers users to bring their own key (BYOK), exactly as when no
// platform key is configured. The window rolls over at UTC midnight.
//
// Verified Pass holders bypass the cap — they've paid, and their volume is
// already day-capped client-side — so a free-tier spike can't lock them out.
//
// Durable + distributed via Upstash Redis when configured; degrades to a
// best-effort in-process counter otherwise. Reads and writes FAIL OPEN: a
// limiter outage must never take roasting down (same posture as ratelimit.ts).
//
// Tune with PLATFORM_DAILY_BUDGET_USD. Set it to 0 to disable the cap entirely.

import { getRedis } from "./redis";
import type { ClaudeUsage } from "./anthropic";

const DAILY_BUDGET_USD = Number(process.env.PLATFORM_DAILY_BUDGET_USD ?? 10);
export const spendCapEnabled = DAILY_BUDGET_USD > 0;

// Budget tracked in integer micro-dollars to avoid float drift under INCRBY.
const BUDGET_MICROS = Math.round(DAILY_BUDGET_USD * 1_000_000);

// USD per 1M tokens, matched by model-id prefix. Falls back to Sonnet pricing
// for any unrecognized model so a custom ROAST_MODEL never prices as free.
const PRICES: { prefix: string; input: number; output: number }[] = [
  { prefix: "claude-opus", input: 5, output: 25 },
  { prefix: "claude-sonnet", input: 3, output: 15 },
  { prefix: "claude-haiku", input: 1, output: 5 },
];
const DEFAULT_PRICE = { input: 3, output: 15 };

export function estimateCostUsd(model: string, usage: ClaudeUsage): number {
  const p = PRICES.find((x) => model.startsWith(x.prefix)) ?? DEFAULT_PRICE;
  return (
    (usage.input_tokens / 1_000_000) * p.input +
    (usage.output_tokens / 1_000_000) * p.output
  );
}

const redis = getRedis();
const DAY_SECONDS = 60 * 60 * 48; // keys self-expire after 2 days

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function keyFor(day: string): string {
  return `burntcv:spend:${day}`;
}

// ---- in-memory fallback (per warm instance only) ----
let memDay = "";
let memMicros = 0;
function memSpent(day: string): number {
  if (memDay !== day) {
    memDay = day;
    memMicros = 0;
  }
  return memMicros;
}

// Is there budget left to serve one more platform-key roast today?
// Note: this is a soft, check-then-act gate — under high concurrency a handful
// of in-flight calls can each pass and collectively overshoot by roughly
// (concurrency × per-call cost). That bounded overshoot is fine for a backstop.
export async function budgetAvailable(): Promise<boolean> {
  if (!spendCapEnabled) return true;
  const day = today();
  if (redis) {
    try {
      const raw = await redis.get<string>(keyFor(day));
      const micros = raw ? Number(raw) : 0;
      return micros < BUDGET_MICROS;
    } catch (err) {
      // Fail open — never let a limiter outage take roasting down.
      console.error("[spendcap] read error, allowing:", err);
      return true;
    }
  }
  return memSpent(day) < BUDGET_MICROS;
}

// Record the cost of a completed platform-key call against today's budget.
export async function recordSpend(
  model: string,
  usage: ClaudeUsage,
): Promise<void> {
  if (!spendCapEnabled) return;
  const micros = Math.round(estimateCostUsd(model, usage) * 1_000_000);
  if (micros <= 0) return;
  const day = today();
  if (redis) {
    try {
      const total = await redis.incrby(keyFor(day), micros);
      // Set the TTL once, when the key is first created this window.
      if (total === micros) await redis.expire(keyFor(day), DAY_SECONDS);
    } catch (err) {
      console.error("[spendcap] record error:", err);
    }
    return;
  }
  memSpent(day); // reset the counter if the day rolled over
  memMicros += micros;
}
