import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { loadFonts } from "./fonts";
import { clamp, EASE_OUT } from "./theme";
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
const SCENES: { from: number; dur: number; tone: Tone; push: number; el: React.ReactNode }[] = [
  { from: 0, dur: 210, tone: "cream", push: 0.03, el: <Scene01Intro /> },
  { from: 210, dur: 240, tone: "stage", push: 0.05, el: <Scene02Bookings /> },
  { from: 450, dur: 260, tone: "cream", push: 0.03, el: <Scene03VoiceNote /> },
  { from: 710, dur: 370, tone: "stage", push: 0.045, el: <Scene04Brief /> },
  { from: 1080, dur: 280, tone: "cream", push: 0.025, el: <Scene05BeforeAfter /> },
  { from: 1360, dur: 240, tone: "stage", push: 0.05, el: <Scene06Dashboard /> },
  { from: 1600, dur: 250, tone: "cream", push: 0.02, el: <Scene07Storefront /> },
  { from: 1850, dur: 160, tone: "cream", push: 0.04, el: <Scene08Outro /> },
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

// Apple-style scene transition: a slow continuous push-in, with a brief
// motion-blur + scale bump at the cut points so beats dissolve cinematically.
const SceneWrap: React.FC<{ dur: number; push: number; children: React.ReactNode }> = ({
  dur,
  push,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, dur - 12, dur], [0, 1, 1, 0], clamp);
  const drift = interpolate(frame, [0, dur], [1, 1 + push], { ...clamp, easing: EASE_OUT });
  const inBump = interpolate(frame, [0, 14], [0.985, 1], { ...clamp, easing: EASE_OUT });
  const outBump = interpolate(frame, [dur - 12, dur], [1, 1.03], { ...clamp, easing: EASE_OUT });
  const scale = drift * inBump * outBump;
  const blur = Math.max(
    interpolate(frame, [0, 12], [7, 0], clamp),
    interpolate(frame, [dur - 12, dur], [0, 7], clamp),
  );
  return (
    <AbsoluteFill style={{ opacity, scale: String(scale), filter: blur > 0.1 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
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
          <SceneWrap dur={s.dur} push={s.push}>
            {s.el}
          </SceneWrap>
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
