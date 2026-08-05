// Proof that a Glow-Up was actually delivered for a given résumé, so the jobs
// route can serve the bonus section without charging or double-gating.
//
// The jobs column is included with a Glow-Up the user already paid for, so it
// must not consume a Pass credit — but it also can't be a free endpoint anyone
// can call with an arbitrary résumé to burn our third-party quota. A short-lived
// receipt keyed by the résumé text threads that needle: only someone who just
// received a Glow-Up for this exact text can fetch jobs for it.
//
// The résumé itself is never stored — only a truncated SHA-256 of it, which is
// all we need to match the follow-up request.

import { createHash } from "crypto";
import { getRedis } from "./redis";

const redis = getRedis();
const TTL_SECONDS = 2 * 60 * 60; // one sitting; the jobs call follows within seconds

export function resumeFingerprint(text: string): string {
  return createHash("sha256")
    .update((text || "").trim().replace(/\s+/g, " ").toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

function keyFor(fp: string): string {
  return `burntcv:gu:${fp}`;
}

export async function markGlowupDelivered(text: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(keyFor(resumeFingerprint(text)), "1", { ex: TTL_SECONDS });
  } catch {
    /* best effort — a missing receipt costs the user nothing, see below */
  }
}

export async function hasGlowupReceipt(text: string): Promise<boolean> {
  if (!redis) return false;
  try {
    return (await redis.get<string>(keyFor(resumeFingerprint(text)))) !== null;
  } catch {
    return false;
  }
}
