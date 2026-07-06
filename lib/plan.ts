// Plan constants shared by client and server code (no "use client" boundary).
// The ₹199 Pass grants 5 roasts/day for 6 months, then needs renewal.
export const PASS_DAYS = 182;
export const PASS_MS = PASS_DAYS * 24 * 60 * 60 * 1000;

// The ₹199 Pass also includes this many Glow-Up rewrites (the high-value fix).
// Once these are used the holder pays ₹49 per extra Glow-Up, same as everyone.
export const GLOWUPS_PER_PASS = 4;
