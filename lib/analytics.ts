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
    | "sample_loaded" // tried the canned sample résumé from the input screen
    | "glowup_setup" // opened the role / JD screen (the step before paying)
    | "glowup_run"
    | "glowup_copy"
    // Live openings attached to a Glow-Up. jobs_loaded carries the result count
    // and any degrade reason — the two numbers that say whether the feature is
    // actually earning its ship criteria (docs/jobs-feed-spec.md §9).
    | "jobs_loaded"
    | "job_apply_click"
    | "company_chip_click" // tapped a Where-To-Aim company → LinkedIn jobs
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
