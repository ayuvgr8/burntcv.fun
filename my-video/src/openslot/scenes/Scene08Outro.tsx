import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, riseIn } from "../theme";
import { LogoMark, PillButton } from "../primitives";
import { Icon } from "../icons";

export const Scene08Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const logoScale = interpolate(frame, [4, 40], [0.6, 1], clamp);
  const logo = interpolate(frame, [4, 26], [0, 1], clamp);
  const cardScale = interpolate(frame, [4, 160], [0.98, 1.02], clamp);
  const h = riseIn(frame, 26, 22, 22);
  const cta = riseIn(frame, 50, 22, 18);

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30, scale: String(cardScale) }}
    >
      <div style={{ opacity: logo, scale: String(logoScale) }}>
        <LogoMark size={112} radius={31} />
      </div>
      <div
        style={{
          ...h,
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: 82,
          letterSpacing: "-0.04em",
          color: COLORS.ink,
          textAlign: "center",
          lineHeight: 1.0,
        }}
      >
        Every booking,
        <br />
        already <span style={{ color: COLORS.green }}>briefed.</span>
      </div>
      <div style={{ ...cta, display: "flex", alignItems: "center", gap: 22, marginTop: 6 }}>
        <PillButton>
          Start free <Icon.Arrow size={20} color={COLORS.onPill} />
        </PillButton>
        <span style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 700, color: COLORS.inkSoft, letterSpacing: "0.02em" }}>
          openslot.space
        </span>
      </div>
    </AbsoluteFill>
  );
};
