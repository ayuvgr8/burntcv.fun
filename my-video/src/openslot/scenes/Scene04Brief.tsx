import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, EASE_OUT, riseIn } from "../theme";
import { Eyebrow } from "../primitives";
import { Icon } from "../icons";
import { BriefCard } from "../mocks";

export const Scene04Brief: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], clamp);
  const eb = riseIn(frame, 8, 18, 16);
  const cardScale = interpolate(frame, [10, 40], [0.94, 1], { ...clamp, easing: EASE_OUT });
  const build = interpolate(frame, [40, 250], [0, 1], clamp);

  // "Claude is writing" indicator, before the body lands.
  const writing = interpolate(frame, [14, 30, 60, 76], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, opacity: enter }}>
      <div style={eb}>
        <Eyebrow text="The artifact" onDark />
      </div>
      <div style={{ position: "relative", scale: String(cardScale), translate: `0px ${Math.sin(frame / 28) * 5}px` }}>
        <div
          style={{
            position: "absolute",
            inset: -40,
            borderRadius: 40,
            background: "radial-gradient(closest-side, rgba(61,180,94,0.25), transparent)",
            filter: "blur(20px)",
          }}
        />
        <div style={{ position: "relative", filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.5))" }}>
          <BriefCard build={build} width={660} />
        </div>
        {writing > 0.02 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -54,
              transform: "translateX(-50%)",
              opacity: writing,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: `1px solid ${COLORS.stageLine}`,
              fontFamily: FONT.mono,
              fontSize: 15,
              color: COLORS.onStageDim,
            }}
          >
            <Icon.Sparkle size={16} color={COLORS.greenBright} /> Claude is reading the transcript…
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
