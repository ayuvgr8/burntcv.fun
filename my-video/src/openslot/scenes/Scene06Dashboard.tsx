import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE_OUT } from "../theme";
import { Eyebrow, Window } from "../primitives";
import { DashboardAppMock } from "../mocks";

export const Scene06Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], clamp);
  const scale = interpolate(frame, [0, 18], [0.96, 1], { ...clamp, easing: EASE_OUT });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter }}>
      <div style={{ position: "absolute", top: 92 }}>
        <Eyebrow text="Inside the product" onDark />
      </div>
      <div style={{ scale: String(scale) }}>
        <Window url="app.openslot.space/dashboard" width={1380} height={730}>
          <DashboardAppMock />
        </Window>
      </div>
    </AbsoluteFill>
  );
};
