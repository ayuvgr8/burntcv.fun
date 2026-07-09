import { Easing, interpolate } from "remotion";

// ── OpenSlot brand tokens (from openslot.space) ──────────────────
// Warm cream canvas, near-black warm ink, one friendly green accent.
// A dark "stage" variant carries the cinematic product-demo shots, where
// light app windows float on a warm charcoal backdrop.

export const COLORS = {
  // Light brand surfaces
  cream: "#F1EEE4",
  creamDeep: "#E9E5D9",
  card: "#FBFAF5",
  cardWarm: "#EAE6DA",

  // Ink (text on cream)
  ink: "#1A1915",
  inkSoft: "#6E695C",
  inkDim: "#9A9486",

  // Hairlines on cream
  line: "rgba(26,25,21,0.10)",
  lineStrong: "rgba(26,25,21,0.18)",

  // Green accent system
  green: "#2EA24E",
  greenBright: "#3BB45C",
  greenInk: "#1E7A38",
  greenSoftBg: "#DCEEDC",
  onGreen: "#FFFFFF",

  // Dark stage (product-demo backdrop)
  stage: "#17160F",
  stageDeep: "#100F0A",
  stageLine: "rgba(255,255,255,0.10)",
  onStage: "#F1EEE4",
  onStageDim: "#A7A296",

  // Avatars (kept colorful, per the site)
  avGreen: "#3DB45E",
  avCoral: "#E8836B",
  avPurple: "#9B8BD6",

  // Button ink pill
  pill: "#1A1915",
  onPill: "#F5F2E9",
} as const;

// Apple-style ease-out and a symmetric in-out.
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Fade + rise-in over `dur` frames starting at `start`. */
export const riseIn = (frame: number, start: number, dur = 18, distance = 26) => {
  const p = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: EASE_OUT });
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
};

/** Opacity envelope: ramps up at the start and down before `dur` ends. */
export const envelope = (frame: number, dur: number, fadeIn = 10, fadeOut = 8) =>
  interpolate(frame, [0, fadeIn, dur - fadeOut, dur], [0, 1, 1, 0], clamp);

/** 0→1 progress across a window, eased. */
export const ramp = (frame: number, start: number, end: number, easing = EASE_OUT) =>
  interpolate(frame, [start, end], [0, 1], { ...clamp, easing });

/** A short attention pulse centered on `at`. */
export const pulse = (frame: number, at: number, width = 12) =>
  interpolate(frame, [at - width, at, at + width], [0, 1, 0], clamp);
