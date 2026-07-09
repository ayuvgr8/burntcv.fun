import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, EASE_OUT, riseIn } from "../theme";
import { Eyebrow, GradientOrb } from "../primitives";

export const Scene01Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const orb = interpolate(frame, [4, 34], [0, 1], clamp);
  const orbScale = interpolate(frame, [4, 44], [0.5, 1], { ...clamp, easing: EASE_OUT });
  const eb = riseIn(frame, 30, 18, 16);
  const h1 = riseIn(frame, 46, 20, 24);
  const h2 = riseIn(frame, 62, 20, 24);
  const tag = riseIn(frame, 88, 22, 18);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
      <div style={{ opacity: orb, scale: String(orbScale) }}>
        <GradientOrb size={150} />
      </div>
      <div style={eb}>
        <Eyebrow text="Voice note → Meeting brief · Claude" />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ ...h1, fontFamily: FONT.sans, fontWeight: 800, fontSize: 116, lineHeight: 0.98, letterSpacing: "-0.045em", color: COLORS.ink }}>
          Every booking,
        </div>
        <div style={{ ...h2, fontFamily: FONT.sans, fontWeight: 800, fontSize: 116, lineHeight: 1.0, letterSpacing: "-0.045em", color: COLORS.ink }}>
          already <span style={{ color: COLORS.green }}>briefed.</span>
        </div>
      </div>
      <div style={{ ...tag, fontFamily: FONT.sans, fontWeight: 500, fontSize: 30, color: COLORS.inkSoft, maxWidth: 820, textAlign: "center", lineHeight: 1.4 }}>
        A calmer way to schedule — you walk in already knowing what matters.
      </div>
    </AbsoluteFill>
  );
};
