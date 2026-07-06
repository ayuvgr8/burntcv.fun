// Plan constants shared by client and server code (no "use client" boundary).
// The ₹199 Pass grants 5 roasts/day for 6 months, then needs renewal.
export const PASS_DAYS = 182;
export const PASS_MS = PASS_DAYS * 24 * 60 * 60 * 1000;

// The ₹199 Pass also includes this many Glow-Up rewrites (the high-value fix).
// Once these are used the holder pays ₹49 per extra Glow-Up, same as everyone.
export const GLOWUPS_PER_PASS = 4;

// Pass roast allowance, enforced server-side per Pass code (see entitlements.ts):
//   • India  → 5 roasts/day for the 6 months.
//   • International → 400 roasts total across the 6 months (no daily cap).
export const ROASTS_PER_DAY = 5;
export const INTL_PASS_ROAST_CAP = 400;
