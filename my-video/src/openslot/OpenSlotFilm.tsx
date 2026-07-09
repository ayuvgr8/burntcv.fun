import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { loadFonts } from "./fonts";
import { clamp } from "./theme";
import { CreamBackground, StageBackground, Subtitle } from "./primitives";
import { CAPTIONS } from "./captions";
import { Scene01Intro } from "./scenes/Scene01Intro";
import { Scene02Bookings } from "./scenes/Scene02Bookings";
import { Scene03VoiceNote } from "./scenes/Scene03VoiceNote";
import { Scene04Brief } from "./scenes/Scene04Brief";
import { Scene05BeforeAfter } from "./scenes/Scene05BeforeAfter";
import { Scene06Dashboard } from "./scenes/Scene06Dashboard";
import { Scene07Storefront } from "./scenes/Scene07Storefront";
import { Scene08Outro } from "./scenes/Scene08Outro";

loadFonts();

type Tone = "cream" | "stage";

// Absolute-frame plan (30fps · 2010 frames · 67s). Hybrid: cream brand for
// narrative beats, dark stage for the product-UI demo shots.
const SCENES: { from: number; dur: number; tone: Tone; el: React.ReactNode }[] = [
  { from: 0, dur: 210, tone: "cream", el: <Scene01Intro /> },
  { from: 210, dur: 240, tone: "stage", el: <Scene02Bookings /> },
  { from: 450, dur: 260, tone: "cream", el: <Scene03VoiceNote /> },
  { from: 710, dur: 370, tone: "stage", el: <Scene04Brief /> },
  { from: 1080, dur: 280, tone: "cream", el: <Scene05BeforeAfter /> },
  { from: 1360, dur: 240, tone: "stage", el: <Scene06Dashboard /> },
  { from: 1600, dur: 250, tone: "cream", el: <Scene07Storefront /> },
  { from: 1850, dur: 160, tone: "cream", el: <Scene08Outro /> },
];

const XFADE = 12;

// Cross-fades cream ↔ stage across scene boundaries so tone changes glide.
const stageOpacityAt = (frame: number) => {
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    const end = s.from + s.dur;
    if (frame >= s.from && frame < end) {
      const cur = s.tone === "stage" ? 1 : 0;
      // Blend near the incoming boundary with the previous scene.
      if (i > 0 && frame < s.from + XFADE) {
        const prev = SCENES[i - 1].tone === "stage" ? 1 : 0;
        return interpolate(frame, [s.from, s.from + XFADE], [prev, cur], clamp);
      }
      return cur;
    }
  }
  return SCENES[SCENES.length - 1].tone === "stage" ? 1 : 0;
};

const BaseBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const stage = stageOpacityAt(frame);
  return (
    <AbsoluteFill>
      <CreamBackground />
      <AbsoluteFill style={{ opacity: stage }}>
        <StageBackground />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Fades a scene's edges so content dissolves over the shared background.
const SceneWrap: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, dur - 10, dur], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const CaptionClip: React.FC<{ text: string; dur: number; onDark?: boolean }> = ({ text, dur, onDark }) => {
  const frame = useCurrentFrame();
  return <Subtitle text={text} localFrame={frame} dur={dur} onDark={onDark} />;
};

export const OpenSlotFilm: React.FC = () => {
  return (
    <AbsoluteFill>
      <BaseBackground />

      {SCENES.map((s) => (
        <Sequence key={s.from} from={s.from} durationInFrames={s.dur}>
          <SceneWrap dur={s.dur}>{s.el}</SceneWrap>
        </Sequence>
      ))}

      {CAPTIONS.map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={c.dur} layout="none">
          <CaptionClip text={c.text} dur={c.dur} onDark={c.onDark} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
