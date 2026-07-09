import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, riseIn } from "../theme";
import { Eyebrow, LogoMark } from "../primitives";

export const Scene01Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = interpolate(frame, [6, 34], [0, 1], clamp);
  const logoScale = interpolate(frame, [6, 40], [0.6, 1], clamp);
  const eb = riseIn(frame, 26, 18, 16);
  const h1 = riseIn(frame, 42, 20, 24);
  const h2 = riseIn(frame, 58, 20, 24);
  const tag = riseIn(frame, 84, 22, 18);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
      <div style={{ opacity: logo, scale: String(logoScale) }}>
        <LogoMark size={96} radius={27} progress={interpolate(frame, [16, 44], [0, 1], clamp)} />
      </div>
      <div style={eb}>
        <Eyebrow text="Voice note → Meeting brief · Claude" />
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            ...h1,
            fontFamily: FONT.sans,
            fontWeight: 800,
            fontSize: 118,
            lineHeight: 0.98,
            letterSpacing: "-0.045em",
            color: COLORS.ink,
          }}
        >
          Every booking,
        </div>
        <div
          style={{
            ...h2,
            fontFamily: FONT.sans,
            fontWeight: 800,
            fontSize: 118,
            lineHeight: 1.0,
            letterSpacing: "-0.045em",
            color: COLORS.ink,
          }}
        >
          already <span style={{ color: COLORS.green }}>briefed.</span>
        </div>
      </div>
      <div
        style={{
          ...tag,
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 30,
          color: COLORS.inkSoft,
          maxWidth: 820,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        A calmer way to schedule — you walk in already knowing what matters.
      </div>
    </AbsoluteFill>
  );
};
