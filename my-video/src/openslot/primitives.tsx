import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./fonts";
import { clamp, COLORS, EASE_OUT } from "./theme";
import { Icon } from "./icons";

// ── Backgrounds ──────────────────────────────────────────────────
export const CreamBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 300], [0, 20], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1100px 780px at ${52 + drift * 0.02}% 12%, rgba(255,255,255,0.6), transparent 60%),
             radial-gradient(900px 700px at 85% 100%, rgba(46,162,78,0.06), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: `radial-gradient(rgba(26,25,21,0.05) 1px, transparent 1px)`,
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(90% 80% at 50% 40%, black, transparent 90%)",
          WebkitMaskImage: "radial-gradient(90% 80% at 50% 40%, black, transparent 90%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const StageBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const gx = interpolate(frame, [0, 400], [42, 60]);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.stageDeep }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 900px at ${gx}% 26%, rgba(61,180,94,0.14), transparent 60%),
             radial-gradient(1000px 800px at 80% 92%, rgba(255,255,255,0.05), transparent 62%),
             radial-gradient(140% 120% at 50% 0%, ${COLORS.stage}, ${COLORS.stageDeep} 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
             linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(80% 70% at 50% 45%, black, transparent 85%)",
          WebkitMaskImage: "radial-gradient(80% 70% at 50% 45%, black, transparent 85%)",
        }}
      />
      <AbsoluteFill style={{ boxShadow: "inset 0 0 420px 90px rgba(0,0,0,0.6)" }} />
    </AbsoluteFill>
  );
};

// ── Logo mark ────────────────────────────────────────────────────
// Black tile with two stacked pills (lit white slot over a muted gray one).
export const LogoMark: React.FC<{ size?: number; progress?: number; radius?: number }> = ({
  size = 160,
  progress = 1,
  radius = 30,
}) => {
  const p = interpolate(progress, [0, 1], [0, 1], clamp);
  const barW = 46;
  const barH = 15;
  const x = 60 - barW / 2;
  const rx = barH / 2;
  const top = interpolate(p, [0, 0.6], [0, 1], clamp);
  const bottom = interpolate(p, [0.4, 1], [0, 1], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="os-tile" x1="0" y1="0" x2="0" y2="120">
          <stop offset="0" stopColor="#232019" />
          <stop offset="1" stopColor="#111009" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="112" height="112" rx={radius} fill="url(#os-tile)" />
      <rect
        x={x}
        y={38}
        width={barW}
        height={barH}
        rx={rx}
        fill="#FFFFFF"
        style={{ transformOrigin: "60px 45.5px", scale: String(0.55 + 0.45 * top), opacity: top }}
      />
      <rect
        x={x}
        y={64}
        width={barW}
        height={barH}
        rx={rx}
        fill="#8C8B84"
        style={{ transformOrigin: "60px 71.5px", scale: String(0.55 + 0.45 * bottom), opacity: bottom }}
      />
    </svg>
  );
};

export const Wordmark: React.FC<{ size?: number; color?: string }> = ({
  size = 64,
  color = COLORS.ink,
}) => (
  <span
    style={{
      fontFamily: FONT.sans,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: "-0.02em",
      color,
    }}
  >
    OpenSlot
  </span>
);

export const Logo: React.FC<{ size?: number; color?: string; gap?: number }> = ({
  size = 34,
  color = COLORS.ink,
  gap = 12,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap }}>
    <LogoMark size={size} radius={size * 0.28} />
    <Wordmark size={size * 0.62} color={color} />
  </div>
);

// ── Eyebrow label (mono, uppercase, green dot) ───────────────────
export const Eyebrow: React.FC<{ text: string; onDark?: boolean; style?: React.CSSProperties }> = ({
  text,
  onDark,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 16px",
      borderRadius: 999,
      background: onDark ? "rgba(255,255,255,0.06)" : COLORS.card,
      border: `1px solid ${onDark ? COLORS.stageLine : COLORS.line}`,
      fontFamily: FONT.mono,
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: "0.14em",
      color: onDark ? COLORS.onStageDim : COLORS.inkSoft,
      textTransform: "uppercase",
      ...style,
    }}
  >
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green }} />
    {text}
  </div>
);

// ── Badges ───────────────────────────────────────────────────────
export const GreenBadge: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "6px 13px",
      borderRadius: 999,
      background: COLORS.greenSoftBg,
      color: COLORS.greenInk,
      fontFamily: FONT.sans,
      fontSize: 15,
      fontWeight: 600,
      ...style,
    }}
  >
    {children}
  </span>
);

export const MonoTag: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 12px",
      borderRadius: 8,
      border: `1px solid ${COLORS.lineStrong}`,
      color: COLORS.inkSoft,
      fontFamily: FONT.mono,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </span>
);

export const PillButton: React.FC<{ children: React.ReactNode; green?: boolean; style?: React.CSSProperties }> = ({
  children,
  green,
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "15px 28px",
      borderRadius: 999,
      background: green ? COLORS.greenBright : COLORS.pill,
      color: green ? COLORS.onGreen : COLORS.onPill,
      fontFamily: FONT.sans,
      fontSize: 20,
      fontWeight: 600,
      ...style,
    }}
  >
    {children}
  </span>
);

// ── Avatar ───────────────────────────────────────────────────────
export const Avatar: React.FC<{ initials: string; size?: number; color?: string }> = ({
  initials,
  size = 44,
  color = COLORS.avGreen,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT.sans,
      fontWeight: 700,
      fontSize: size * 0.38,
      color: "#fff",
      flexShrink: 0,
    }}
  >
    {initials}
  </div>
);

// ── Light app window (floats on the dark stage) ──────────────────
export const Window: React.FC<{
  url?: string;
  width?: number | string;
  height?: number | string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ url, width = 1280, height, children, style }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 22,
      overflow: "hidden",
      background: COLORS.card,
      border: `1px solid ${COLORS.line}`,
      boxShadow: "0 50px 130px -30px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    <div
      style={{
        height: 50,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 20px",
        background: COLORS.creamDeep,
        borderBottom: `1px solid ${COLORS.line}`,
      }}
    >
      <span style={dot("#E8836B")} />
      <span style={dot("#E7B84E")} />
      <span style={dot("#59C06B")} />
      {url && (
        <div
          style={{
            margin: "0 auto",
            minWidth: 320,
            height: 30,
            borderRadius: 9,
            background: "rgba(255,255,255,0.6)",
            border: `1px solid ${COLORS.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "0 14px",
            fontFamily: FONT.mono,
            fontSize: 14,
            color: COLORS.inkDim,
          }}
        >
          <Icon.Lock size={13} color={COLORS.inkDim} />
          {url}
        </div>
      )}
    </div>
    <div style={{ flex: 1, minHeight: 0, position: "relative", background: COLORS.card }}>{children}</div>
  </div>
);

const dot = (c: string): React.CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: c,
  display: "inline-block",
});

// ── Cursor (dark, for light UI) ──────────────────────────────────
export const Cursor: React.FC<{ x: number; y: number; clicking?: number; label?: string }> = ({
  x,
  y,
  clicking = 0,
  label,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      scale: String(1 - clicking * 0.16),
      filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))",
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
          border: `2px solid ${COLORS.green}`,
          opacity: clicking * 0.7,
          scale: String(0.4 + clicking * 1.1),
        }}
      />
    )}
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3l14 7-6 2 3.5 6.5-2.5 1.2L10.5 13 5 17.5V3z"
        fill="#1A1915"
        stroke="#fff"
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
          background: COLORS.ink,
          color: COLORS.onPill,
          fontFamily: FONT.sans,
          fontSize: 14,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    )}
  </div>
);

// ── Subtitles (tone-aware) ───────────────────────────────────────
export const Subtitle: React.FC<{ text: string; localFrame: number; dur: number; onDark?: boolean }> = ({
  text,
  localFrame,
  dur,
  onDark,
}) => {
  const opacity = interpolate(localFrame, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  const y = interpolate(localFrame, [0, 12], [10, 0], { ...clamp, easing: EASE_OUT });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 70,
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
          maxWidth: 1180,
          textAlign: "center",
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: 34,
          lineHeight: 1.32,
          letterSpacing: "-0.01em",
          color: onDark ? COLORS.onStage : COLORS.ink,
          padding: "0 60px",
          textShadow: onDark ? "0 2px 20px rgba(0,0,0,0.7)" : "none",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Scene enter/exit envelope helper.
export const useSceneEnter = (fadeIn = 12, fadeOut = 10) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  return { opacity, frame, durationInFrames };
};
