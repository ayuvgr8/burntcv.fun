import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE_OUT } from "../theme";
import { CodeLabel, Cursor, Window } from "../primitives";
import { BookingMock, Slot } from "../mocks";

const TEMPLATE: { time: string; t: Slot["state"] }[] = [
  { time: "9:00 AM", t: "busy" },
  { time: "9:30 AM", t: "free" },
  { time: "10:00 AM", t: "busy" },
  { time: "10:30 AM", t: "free" },
  { time: "11:00 AM", t: "busy" },
  { time: "11:30 AM", t: "free" },
  { time: "1:00 PM", t: "free" },
];

export const Scene04Availability: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], clamp);

  // Busy slots fill in one-by-one as free/busy is computed.
  const slots: Slot[] = TEMPLATE.map((s, i) => ({
    time: s.time,
    state: frame >= 84 + i * 9 ? s.t : "free",
  }));

  const cx = interpolate(frame, [8, 44, 74, 122], [1540, 770, 770, 1500], {
    ...clamp,
    easing: EASE_OUT,
  });
  const cy = interpolate(frame, [8, 44, 74, 122], [300, 430, 430, 417], {
    ...clamp,
    easing: EASE_OUT,
  });
  const press = interpolate(frame, [44, 50, 58], [0, 1, 0], clamp);

  const hovering = frame >= 132 && frame <= 320;
  const labelProgress = interpolate(frame, [118, 140], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter }}>
      <Window url="openslot.io/alex/30min" width={1400} height={760}>
        <BookingMock slots={slots} activeDate={14} />
      </Window>
      <Cursor x={cx} y={cy} clicking={press} label={hovering ? "Busy — kept private" : undefined} />
      {labelProgress > 0 && (
        <CodeLabel
          text="calendar.freebusy"
          progress={labelProgress}
          style={{ left: "50%", marginLeft: -130, top: 862 }}
        />
      )}
    </AbsoluteFill>
  );
};
