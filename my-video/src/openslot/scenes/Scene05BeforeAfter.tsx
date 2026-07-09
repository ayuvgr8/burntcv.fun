import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, riseIn } from "../theme";
import { GreenBadge, MonoTag } from "../primitives";
import { Icon } from "../icons";
import { MiniBooking } from "../mocks";

export const Scene05BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], clamp);
  const head = riseIn(frame, 10, 22, 24);
  const before = riseIn(frame, 44, 22, 26);
  const after = riseIn(frame, 62, 22, 26);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 48, opacity: enter, padding: "0 120px" }}>
      <div
        style={{
          ...head,
          textAlign: "center",
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: 68,
          letterSpacing: "-0.03em",
          color: COLORS.ink,
          lineHeight: 1.02,
        }}
      >
        You don't get a booking.
        <br />
        You get a <span style={{ color: COLORS.green }}>briefing.</span>
      </div>
      <div style={{ display: "flex", gap: 28, width: "100%", maxWidth: 1320, justifyContent: "center" }}>
        {/* BEFORE */}
        <div style={{ ...before, flex: 1, padding: "34px 36px", borderRadius: 22, background: COLORS.cardWarm, border: `1px solid ${COLORS.line}` }}>
          <MonoTag>Before</MonoTag>
          <div style={{ fontFamily: FONT.sans, fontSize: 34, fontWeight: 800, color: COLORS.inkSoft, marginTop: 18, letterSpacing: "-0.02em" }}>
            A booking is a name and a time.
          </div>
          <div style={{ fontSize: 19, color: COLORS.inkDim, marginTop: 8, marginBottom: 26 }}>You walk in blind.</div>
          <MiniBooking muted right={<MonoTag>No context</MonoTag>} />
        </div>
        {/* AFTER */}
        <div style={{ ...after, flex: 1, padding: "34px 36px", borderRadius: 22, background: COLORS.card, border: `1.5px solid ${COLORS.green}`, boxShadow: "0 20px 60px -24px rgba(46,162,78,0.4)" }}>
          <MonoTag style={{ color: COLORS.greenInk, borderColor: "rgba(46,162,78,0.4)" }}>With OpenSlot</MonoTag>
          <div style={{ fontFamily: FONT.sans, fontSize: 34, fontWeight: 800, color: COLORS.ink, marginTop: 18, letterSpacing: "-0.02em" }}>
            A booking is context, a brief, and payment.
          </div>
          <div style={{ fontSize: 19, color: COLORS.inkSoft, marginTop: 8, marginBottom: 26 }}>You walk in ready.</div>
          <MiniBooking
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <GreenBadge><Icon.Mic size={14} color={COLORS.green} /> Voice note</GreenBadge>
                <GreenBadge><Icon.Sparkle size={14} color={COLORS.green} /> Brief</GreenBadge>
                <GreenBadge><Icon.Check size={14} color={COLORS.green} strokeWidth={2.6} /> Paid</GreenBadge>
              </div>
            }
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
