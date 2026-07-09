import { Easing, interpolate } from "remotion";

// ── Design tokens ────────────────────────────────────────────────
// Apple-meets-Linear: deep near-black canvas, one restrained indigo accent,
// generous negative space, crisp hairline borders.

export const COLORS = {
  bg: "#08080C",
  bgDeep: "#050507",
  surface: "#131316",
  surfaceHi: "#1C1C20",
  surfaceLo: "#0E0E11",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.16)",

  text: "#F5F5F7",
  textMuted: "#9A9AA2",
  textDim: "#5C5C64",

  // Monochrome brand system: white is the emphasis "accent". Anything filled
  // with `accent` puts `onAccent` (near-black) on top of it.
  accent: "#F4F4F6",
  accentSoft: "#B7B7BF",
  accent2: "#7E7E86",
  onAccent: "#0A0A0E",
  glow: "rgba(255,255,255,0.22)",

  // Status colors are grayscale too; meaning is carried by icon + copy.
  success: "#EDEDF2",
  danger: "#B4B4BC",
  busy: "#212127",

  // Google keeps its real brand colors in the OAuth scene only.
  google: {
    blue: "#4285F4",
    red: "#EA4335",
    yellow: "#FBBC05",
    green: "#34A853",
  },
} as const;

// Apple-style ease-out (fast then settle) and a symmetric in-out.
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

// ── Timing helpers ───────────────────────────────────────────────

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Fade + rise-in over `dur` frames starting at `start`. */
export const riseIn = (
  frame: number,
  start: number,
  dur = 18,
  distance = 26,
) => {
  const p = interpolate(frame, [start, start + dur], [0, 1], {
    ...clamp,
    easing: EASE_OUT,
  });
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * distance}px)`,
  };
};

/** Opacity envelope: ramps up at the start and down before `dur` ends. */
export const envelope = (
  frame: number,
  dur: number,
  fadeIn = 10,
  fadeOut = 8,
) =>
  interpolate(
    frame,
    [0, fadeIn, dur - fadeOut, dur],
    [0, 1, 1, 0],
    clamp,
  );

/** 0→1 progress across a window, eased. */
export const ramp = (
  frame: number,
  start: number,
  end: number,
  easing = EASE_OUT,
) => interpolate(frame, [start, end], [0, 1], { ...clamp, easing });

/** A short attention pulse centered on `at`. */
export const pulse = (frame: number, at: number, width = 12) =>
  interpolate(
    frame,
    [at - width, at, at + width],
    [0, 1, 0],
    clamp,
  );
