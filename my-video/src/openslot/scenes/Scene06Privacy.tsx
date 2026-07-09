import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, EASE_OUT } from "../theme";
import { Window } from "../primitives";
import { PrivacyMock } from "../mocks";

const PROMISES = [
  { icon: "🚫", text: "No ads" },
  { icon: "🔒", text: "No selling data" },
  { icon: "🗓️", text: "Only scheduling" },
];

export const Scene06Privacy: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], clamp);
  const shield = interpolate(frame, [10, 56], [0, 1], { ...clamp, easing: EASE_OUT });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <Window url="app.openslot.io/privacy" width={1100} height={620}>
          <PrivacyMock shield={shield} />
        </Window>
        <div style={{ display: "flex", gap: 20 }}>
          {PROMISES.map((p, i) => {
            const a = interpolate(frame, [70 + i * 24, 92 + i * 24], [0, 1], {
              ...clamp,
              easing: EASE_OUT,
            });
            return (
              <div
                key={p.text}
                style={{
                  opacity: a,
                  transform: `translateY(${(1 - a) * 18}px)`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 26px",
                  borderRadius: 999,
                  background: "rgba(15,15,22,0.7)",
                  border: `1px solid ${COLORS.line}`,
                  backdropFilter: "blur(8px)",
                  fontFamily: FONT.sans,
                  fontSize: 24,
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                <span style={{ fontSize: 26 }}>{p.icon}</span>
                {p.text}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
