import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, riseIn } from "../theme";
import { Eyebrow } from "../primitives";
import { Icon } from "../icons";
import { VoiceNoteCard } from "../mocks";

export const Scene03VoiceNote: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], clamp);
  const cardRise = riseIn(frame, 12, 20, 22);
  const record = interpolate(frame, [40, 214], [0, 1], clamp);

  const quote = riseIn(frame, 176, 22, 20);
  const quoteOut = interpolate(frame, [176, 196, 250, 260], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30, opacity: enter }}>
      <Eyebrow text="Guest leaves a voice note" />
      <div style={cardRise}>
        <VoiceNoteCard record={record} width={620} />
      </div>
      <div
        style={{
          opacity: (quote.opacity as number) * quoteOut,
          transform: quote.transform,
          display: "flex",
          alignItems: "center",
          gap: 14,
          maxWidth: 760,
          padding: "16px 24px",
          borderRadius: 14,
          background: COLORS.card,
          border: `1px solid ${COLORS.line}`,
          fontFamily: FONT.sans,
          fontSize: 22,
          fontStyle: "italic",
          color: COLORS.inkSoft,
        }}
      >
        <Icon.Waveform size={24} color={COLORS.green} />
        “Hi Alex — I want help scaling my design team from four to nine…”
      </div>
    </AbsoluteFill>
  );
};
