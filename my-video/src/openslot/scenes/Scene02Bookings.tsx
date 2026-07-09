import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, EASE_OUT, riseIn } from "../theme";
import { Eyebrow, Window } from "../primitives";
import { Icon } from "../icons";
import { BookingsAppMock } from "../mocks";

export const Scene02Bookings: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], clamp);
  const scale = interpolate(frame, [0, 16], [0.97, 1], { ...clamp, easing: EASE_OUT });
  const briefReveal = interpolate(frame, [78, 108], [0, 1], clamp);

  const toast = riseIn(frame, 124, 20, -22);
  const toastOut = interpolate(frame, [124, 140, 220, 236], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter }}>
      <div style={{ position: "absolute", top: 96 }}>
        <Eyebrow text="Today's calls" onDark />
      </div>
      <div style={{ scale: String(scale), position: "relative" }}>
        <Window url="app.openslot.space/bookings" width={1360} height={720}>
          <BookingsAppMock activeNav={0} briefReveal={briefReveal} />
        </Window>
        {/* floating toast */}
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -34,
            opacity: (toast.opacity as number) * toastOut,
            transform: toast.transform,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px",
            borderRadius: 16,
            background: COLORS.card,
            border: `1px solid ${COLORS.line}`,
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.5)",
            fontFamily: FONT.sans,
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 11, background: COLORS.greenSoftBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.Sparkle size={22} color={COLORS.green} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.ink }}>Brief ready</div>
            <div style={{ fontSize: 14, color: COLORS.inkSoft }}>before your 10:00 call</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
