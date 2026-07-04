"use client";

import { track } from "@vercel/analytics";

// Thin, crash-proof wrapper around Vercel Analytics custom events. In dev / when
// Analytics isn't mounted this no-ops. The North Star is share rate (PRD §15),
// so roast_completed is the denominator and card_share/download the numerator.
export function ev(
  name:
    | "roast_completed"
    | "card_download"
    | "card_share"
    | "caption_copy"
    | "glowup_run"
    | "purchase"
    | "byok_added",
  props?: Record<string, string | number | boolean>,
): void {
  try {
    track(name, props);
  } catch {
    /* never let analytics break the app */
  }
}
