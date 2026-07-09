import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { loadFonts } from "./fonts";
import { clamp } from "./theme";
import { Background, Subtitle } from "./primitives";
import { CAPTIONS } from "./captions";
import { Scene01Intro } from "./scenes/Scene01Intro";
import { Scene02Connect } from "./scenes/Scene02Connect";
import { Scene03Calendars } from "./scenes/Scene03Calendars";
import { Scene04Availability } from "./scenes/Scene04Availability";
import { Scene05Booking } from "./scenes/Scene05Booking";
import { Scene06Privacy } from "./scenes/Scene06Privacy";
import { Scene07Outro } from "./scenes/Scene07Outro";

loadFonts();

// Absolute-frame scene plan (30fps · 1950 frames · 65s).
const SCENES: { from: number; dur: number; el: React.ReactNode }[] = [
  { from: 0, dur: 150, el: <Scene01Intro /> },
  { from: 150, dur: 210, el: <Scene02Connect /> },
  { from: 360, dur: 300, el: <Scene03Calendars /> },
  { from: 660, dur: 390, el: <Scene04Availability /> },
  { from: 1050, dur: 450, el: <Scene05Booking /> },
  { from: 1500, dur: 240, el: <Scene06Privacy /> },
  { from: 1740, dur: 210, el: <Scene07Outro /> },
];

// Fades a scene's tail so cuts dissolve through the shared background.
const SceneWrap: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [dur - 10, dur], [1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const CaptionClip: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const frame = useCurrentFrame();
  return <Subtitle text={text} localFrame={frame} dur={dur} />;
};

export const OpenSlotFilm: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />

      {SCENES.map((s) => (
        <Sequence key={s.from} from={s.from} durationInFrames={s.dur}>
          <SceneWrap dur={s.dur}>{s.el}</SceneWrap>
        </Sequence>
      ))}

      {CAPTIONS.map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={c.dur} layout="none">
          <CaptionClip text={c.text} dur={c.dur} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
