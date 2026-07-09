import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT } from "./fonts";
import { clamp, COLORS, EASE_OUT, ramp, riseIn } from "./theme";

// ── Continuous background ────────────────────────────────────────
// Lives behind every scene so cuts feel like one continuous space.
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Slow drifting accent glow.
  const gx = interpolate(frame, [0, 1950], [0.32, 0.62]) * width;
  const gy = interpolate(frame, [0, 1950], [0.28, 0.5]) * height;
  const gx2 = interpolate(frame, [0, 1950], [0.78, 0.42]) * width;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDeep }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 900px at ${gx}px ${gy}px, rgba(124,107,255,0.18), transparent 60%),
             radial-gradient(1000px 800px at ${gx2}px 78%, rgba(76,194,255,0.10), transparent 62%),
             radial-gradient(140% 120% at 50% 0%, ${COLORS.bg}, ${COLORS.bgDeep} 70%)`,
        }}
      />
      {/* Faint grid for depth */}
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
             linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(80% 70% at 50% 45%, black, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(80% 70% at 50% 45%, black, transparent 85%)",
        }}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 400px 80px rgba(0,0,0,0.65)",
        }}
      />
    </AbsoluteFill>
  );
};

// ── Logo mark ────────────────────────────────────────────────────
// Rounded app-icon square holding a calendar with one lit "open slot".
export const LogoMark: React.FC<{ size?: number; progress?: number }> = ({
  size = 160,
  progress = 1,
}) => {
  const draw = interpolate(progress, [0, 1], [0, 1], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="os-mark" x1="0" y1="0" x2="120" y2="120">
          <stop offset="0" stopColor="#8A79FF" />
          <stop offset="1" stopColor="#5B49E0" />
        </linearGradient>
        <linearGradient id="os-slot" x1="0" y1="0" x2="0" y2="120">
          <stop offset="0" stopColor="#EAE6FF" />
          <stop offset="1" stopColor="#B9AEFF" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="108" height="108" rx="30" fill="url(#os-mark)" />
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="30"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
      />
      {/* calendar body */}
      <rect
        x="30"
        y="34"
        width="60"
        height="54"
        rx="12"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2.5"
      />
      {/* hanger dots */}
      <circle cx="45" cy="32" r="4" fill="#fff" />
      <circle cx="75" cy="32" r="4" fill="#fff" />
      {/* the lit open slot */}
      <rect
        x="42"
        y="58"
        width="36"
        height="12"
        rx="6"
        fill="url(#os-slot)"
        style={{
          transformOrigin: "60px 64px",
          scale: String(0.4 + 0.6 * draw),
          opacity: draw,
        }}
      />
    </svg>
  );
};

export const Wordmark: React.FC<{ size?: number; color?: string }> = ({
  size = 64,
  color = COLORS.text,
}) => (
  <span
    style={{
      fontFamily: FONT.sans,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "-0.03em",
      color,
      display: "inline-flex",
      alignItems: "baseline",
    }}
  >
    Open
    <span style={{ color: COLORS.accentSoft }}>Slot</span>
  </span>
);

// ── Google "G" ───────────────────────────────────────────────────
export const GoogleG: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path
      fill={COLORS.google.blue}
      d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
    />
    <path
      fill={COLORS.google.green}
      d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
    />
    <path
      fill={COLORS.google.yellow}
      d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
    />
    <path
      fill={COLORS.google.red}
      d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
    />
  </svg>
);

// ── Cursor ───────────────────────────────────────────────────────
export const Cursor: React.FC<{
  x: number;
  y: number;
  clicking?: number; // 0..1 press amount
  label?: string;
}> = ({ x, y, clicking = 0, label }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      scale: String(1 - clicking * 0.16),
      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
      zIndex: 40,
    }}
  >
    {clicking > 0.05 && (
      <div
        style={{
          position: "absolute",
          left: 2,
          top: 2,
          width: 44,
          height: 44,
          marginLeft: -22,
          marginTop: -22,
          borderRadius: "50%",
          border: `2px solid ${COLORS.accentSoft}`,
          opacity: clicking * 0.7,
          scale: String(0.4 + clicking * 1.1),
        }}
      />
    )}
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3l14 7-6 2 3.5 6.5-2.5 1.2L10.5 13 5 17.5V3z"
        fill="#fff"
        stroke="#0A0A0F"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
    {label && (
      <div
        style={{
          position: "absolute",
          left: 26,
          top: 20,
          padding: "5px 10px",
          borderRadius: 8,
          background: "rgba(10,10,15,0.9)",
          border: `1px solid ${COLORS.line}`,
          color: COLORS.textMuted,
          fontFamily: FONT.sans,
          fontSize: 15,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    )}
  </div>
);

// ── Browser / app window frame ───────────────────────────────────
export const Window: React.FC<{
  url?: string;
  width?: number | string;
  height?: number | string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: boolean;
}> = ({ url, width = 1280, height, children, style, accent }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 20,
      overflow: "hidden",
      background: COLORS.surface,
      border: `1px solid ${accent ? "rgba(124,107,255,0.35)" : COLORS.line}`,
      boxShadow:
        "0 40px 120px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    <div
      style={{
        height: 48,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 18px",
        background: COLORS.surfaceLo,
        borderBottom: `1px solid ${COLORS.line}`,
      }}
    >
      <span style={dot("#FF5F57")} />
      <span style={dot("#FEBC2E")} />
      <span style={dot("#28C840")} />
      {url && (
        <div
          style={{
            marginLeft: 16,
            flex: 1,
            maxWidth: 420,
            height: 28,
            borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${COLORS.line}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            fontFamily: FONT.sans,
            fontSize: 14,
            color: COLORS.textDim,
          }}
        >
          <span style={{ opacity: 0.7 }}>🔒</span>
          {url}
        </div>
      )}
    </div>
    <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>
  </div>
);

const dot = (c: string): React.CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: c,
  display: "inline-block",
});

// ── Floating code label (permission scope chips) ─────────────────
export const CodeLabel: React.FC<{
  text: string;
  progress: number;
  style?: React.CSSProperties;
}> = ({ text, progress, style }) => {
  const rise = riseIn(progress * 20, 0, 18, 18);
  return (
    <div
      style={{
        position: "absolute",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 12,
        background: "rgba(15,15,22,0.82)",
        border: `1px solid rgba(124,107,255,0.4)`,
        boxShadow: `0 0 30px -6px ${COLORS.glow}`,
        backdropFilter: "blur(8px)",
        fontFamily: FONT.mono,
        fontSize: 24,
        color: COLORS.accentSoft,
        letterSpacing: "-0.01em",
        zIndex: 30,
        ...rise,
        ...style,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: COLORS.accent,
          boxShadow: `0 0 12px ${COLORS.accent}`,
        }}
      />
      {text}
    </div>
  );
};

// ── Subtitles (voiceover captions) ───────────────────────────────
export const Subtitle: React.FC<{ text: string; localFrame: number; dur: number }> = ({
  text,
  localFrame,
  dur,
}) => {
  const opacity = interpolate(
    localFrame,
    [0, 8, dur - 8, dur],
    [0, 1, 1, 0],
    clamp,
  );
  const y = interpolate(localFrame, [0, 12], [10, 0], {
    ...clamp,
    easing: EASE_OUT,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 68,
        display: "flex",
        justifyContent: "center",
        zIndex: 60,
        opacity,
        transform: `translateY(${y}px)`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          textAlign: "center",
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 34,
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
          color: COLORS.text,
          padding: "0 60px",
          textShadow: "0 2px 20px rgba(0,0,0,0.9)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Small pill used across mock UIs.
export const Pill: React.FC<{
  children: React.ReactNode;
  color?: string;
  bg?: string;
  style?: React.CSSProperties;
}> = ({ children, color = COLORS.textMuted, bg = "rgba(255,255,255,0.06)", style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      borderRadius: 999,
      fontFamily: FONT.sans,
      fontSize: 16,
      fontWeight: 500,
      color,
      background: bg,
      border: `1px solid ${COLORS.line}`,
      ...style,
    }}
  >
    {children}
  </span>
);

export const useSceneEnter = (fadeIn = 12, fadeOut = 10) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  const scale = interpolate(frame, [0, fadeIn], [0.985, 1], {
    ...clamp,
    easing: EASE_OUT,
  });
  return { opacity, scale, frame, durationInFrames, ramp };
};
