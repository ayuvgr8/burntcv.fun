import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, EASE_OUT } from "../theme";
import { Cursor, Window } from "../primitives";
import { ConsentMock, HomepageMock } from "../mocks";

const SCOPES = ["Calendar List", "Free / Busy", "Calendar Events"];

export const Scene02Connect: React.FC = () => {
  const frame = useCurrentFrame();

  const homeOp = interpolate(frame, [0, 16, 60, 74], [0, 1, 1, 0], clamp);
  const consentOp = interpolate(frame, [64, 82], [0, 1], clamp);

  // Cursor glides to the button and clicks.
  const cx = interpolate(frame, [6, 40], [1200, 1002], { ...clamp, easing: EASE_OUT });
  const cy = interpolate(frame, [6, 40], [780, 636], { ...clamp, easing: EASE_OUT });
  const press = interpolate(frame, [44, 50, 58], [0, 1, 0], clamp);

  // Sequential permission highlight.
  let highlight = -1;
  if (frame >= 110 && frame < 144) highlight = 0;
  else if (frame >= 144 && frame < 178) highlight = 1;
  else if (frame >= 178) highlight = 2;

  return (
    <AbsoluteFill>
      {/* Homepage */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: homeOp }}>
        <Window url="openslot.io" width={1360} height={780}>
          <HomepageMock press={press} />
        </Window>
        <Cursor x={cx} y={cy} clicking={press} />
      </AbsoluteFill>

      {/* Consent + callouts */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: consentOp }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Window width={1000} height={720}>
            <ConsentMock reveal={3} highlight={highlight} />
          </Window>
          {/* checklist callouts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, width: 300 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 17, color: COLORS.textDim, fontWeight: 600, marginBottom: 4 }}>
              Only what scheduling needs
            </div>
            {SCOPES.map((s, i) => {
              const active = highlight >= i;
              const isCurrent = highlight === i;
              const app = interpolate(frame, [96 + i * 6, 112 + i * 6], [0, 1], clamp);
              return (
                <div
                  key={s}
                  style={{
                    opacity: app,
                    transform: `translateX(${(1 - app) * 20}px)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: active ? "rgba(255,255,255,0.12)" : COLORS.surface,
                    border: `1px solid ${isCurrent ? "rgba(255,255,255,0.6)" : COLORS.line}`,
                    boxShadow: isCurrent ? `0 0 30px -8px ${COLORS.glow}` : "none",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: active ? COLORS.accent : "transparent",
                      border: `2px solid ${active ? COLORS.accent : COLORS.lineStrong}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {active && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5 9-11" stroke={COLORS.onAccent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: FONT.sans,
                      fontSize: 18,
                      fontWeight: 600,
                      color: active ? COLORS.text : COLORS.textMuted,
                    }}
                  >
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
