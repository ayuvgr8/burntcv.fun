import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, EASE_OUT, riseIn } from "../theme";
import { LogoMark, Window } from "../primitives";
import { DashboardMock } from "../mocks";

export const Scene01Intro: React.FC = () => {
  const frame = useCurrentFrame();

  // Intro title group
  const groupOut = interpolate(frame, [82, 100], [1, 0], clamp);
  const logoScale = interpolate(frame, [6, 42], [0.55, 1], { ...clamp, easing: EASE_OUT });
  const logoOp = interpolate(frame, [6, 26], [0, 1], clamp);
  const h1 = riseIn(frame, 40, 20, 24);
  const h2 = riseIn(frame, 62, 20, 20);

  // Dashboard zoom-in
  const dashOp = interpolate(frame, [90, 110], [0, 1], clamp);
  const dashScale = interpolate(frame, [88, 150], [0.82, 1.04], { ...clamp, easing: EASE_OUT });

  return (
    <AbsoluteFill>
      {/* Dashboard reveal */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: dashOp }}>
        <div style={{ scale: String(dashScale) }}>
          <Window url="app.openslot.io" width={1360} height={780}>
            <DashboardMock />
          </Window>
        </div>
      </AbsoluteFill>

      {/* Title */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 30,
          opacity: groupOut,
        }}
      >
        <div style={{ opacity: logoOp, scale: String(logoScale), filter: `drop-shadow(0 0 60px ${COLORS.glow})` }}>
          <LogoMark size={150} progress={interpolate(frame, [20, 46], [0, 1], clamp)} />
        </div>
        <div style={{ ...h1, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT.sans,
              fontWeight: 800,
              fontSize: 96,
              letterSpacing: "-0.04em",
              color: COLORS.text,
            }}
          >
            Meet Open<span style={{ color: COLORS.accentSoft }}>Slot</span>.
          </div>
        </div>
        <div
          style={{
            ...h2,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: "-0.01em",
            color: COLORS.textMuted,
          }}
        >
          Scheduling. Simplified.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
