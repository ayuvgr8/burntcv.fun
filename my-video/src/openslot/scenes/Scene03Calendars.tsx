import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE_OUT } from "../theme";
import { CodeLabel, Cursor, Window } from "../primitives";
import { CalendarListMock } from "../mocks";

export const Scene03Calendars: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], clamp);

  const selected = [frame >= 46, frame >= 96, frame >= 146];

  const cx = interpolate(frame, [8, 40], [1340, 1273], { ...clamp, easing: EASE_OUT });
  const cy = interpolate(
    frame,
    [8, 40, 66, 90, 116, 142],
    [300, 363, 363, 453, 453, 543],
    { ...clamp, easing: EASE_OUT },
  );
  const clickAt = (f: number) => interpolate(frame, [f - 6, f, f + 8], [0, 1, 0], clamp);
  const press = Math.max(clickAt(48), clickAt(98), clickAt(148));

  const labelProgress = interpolate(frame, [150, 172], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter }}>
      <Window url="app.openslot.io/calendars" width={1200} height={720}>
        <CalendarListMock selected={selected} />
      </Window>
      <Cursor x={cx} y={cy} clicking={press} />
      {labelProgress > 0 && (
        <CodeLabel
          text="calendar.calendarlist.readonly"
          progress={labelProgress}
          style={{ left: "50%", marginLeft: -220, top: 858 }}
        />
      )}
    </AbsoluteFill>
  );
};
