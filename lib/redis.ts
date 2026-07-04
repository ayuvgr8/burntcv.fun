import { Redis } from "@upstash/redis";

// Resolve Upstash Redis credentials from whichever env-var names are present.
// Vercel's Upstash Marketplace integration injects UPSTASH_REDIS_REST_*, while
// the legacy Vercel KV integration used KV_REST_API_*. Accept both so
// connecting a store "just works" without renaming anything.
const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

export const hasRedis = !!(REDIS_URL && REDIS_TOKEN);

export function getRedis(): Redis | null {
  if (!hasRedis) return null;
  try {
    // We store/parse JSON ourselves; disable Upstash's auto-(de)serialization
    // so `get` returns the exact string we `set` (matches the in-memory path).
    return new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
      automaticDeserialization: false,
    });
  } catch {
    return null;
  }
}
