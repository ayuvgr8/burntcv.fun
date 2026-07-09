import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, EASE_IN_OUT, EASE_OUT } from "../theme";
import { CodeLabel, Window } from "../primitives";
import { ConfirmationMock, GoogleCalendarMock } from "../mocks";

const StatusChip: React.FC<{ text: string; color: string; alpha: number }> = ({
  text,
  color,
  alpha,
}) => (
  <div
    style={{
      position: "absolute",
      top: 92,
      left: "50%",
      transform: `translateX(-50%) translateY(${(1 - alpha) * -12}px)`,
      opacity: alpha,
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 20px",
      borderRadius: 999,
      background: "rgba(10,10,15,0.86)",
      border: `1px solid ${color}`,
      boxShadow: `0 0 30px -8px ${color}`,
      backdropFilter: "blur(8px)",
      fontFamily: FONT.sans,
      fontSize: 20,
      fontWeight: 600,
      color: COLORS.text,
      zIndex: 40,
    }}
  >
    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
    {text}
  </div>
);

export const Scene05Booking: React.FC = () => {
  const frame = useCurrentFrame();

  const confirmOp = interpolate(frame, [0, 14, 66, 80], [0, 1, 1, 0], clamp);
  const check = interpolate(frame, [8, 52], [0, 1], { ...clamp, easing: EASE_OUT });

  const calOp = interpolate(frame, [72, 88], [0, 1], clamp);

  // Event lifecycle inside Google Calendar.
  const appear = interpolate(frame, [90, 118], [0, 1], { ...clamp, easing: EASE_OUT });
  const cancelFade = interpolate(frame, [324, 350], [1, 0], clamp);
  const eventAlpha = appear * cancelFade;
  const eventScale = interpolate(frame, [90, 122], [0.85, 1], { ...clamp, easing: EASE_OUT });
  const eventTop = interpolate(frame, [224, 262], [140, 300], { ...clamp, easing: EASE_IN_OUT });

  const showPopover = frame >= 152 && frame < 218;
  const popoverAlpha = interpolate(frame, [152, 166, 208, 218], [0, 1, 1, 0], clamp);

  const labelProgress = interpolate(frame, [96, 118], [0, 1], clamp);

  // Status chip content by phase.
  let chip: { text: string; color: string; alpha: number } = {
    text: "",
    color: COLORS.accent,
    alpha: 0,
  };
  const chipFade = (a: number, b: number, c: number, d: number) =>
    interpolate(frame, [a, b, c, d], [0, 1, 1, 0], clamp);
  if (frame < 150) chip = { text: "Booked in Google Calendar", color: COLORS.success, alpha: chipFade(96, 108, 142, 150) };
  else if (frame < 220) chip = { text: "Google Meet added", color: COLORS.accent2, alpha: chipFade(150, 160, 210, 220) };
  else if (frame < 322) chip = { text: "Rescheduled — synced", color: COLORS.accent, alpha: chipFade(222, 234, 312, 322) };
  else chip = { text: "Cancelled — synced", color: COLORS.danger, alpha: chipFade(324, 338, 430, 450) };

  return (
    <AbsoluteFill>
      {/* Confirmation */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: confirmOp }}>
        <Window url="openslot.io/alex/30min" width={1200} height={720}>
          <ConfirmationMock check={check} />
        </Window>
      </AbsoluteFill>

      {/* Google Calendar */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: calOp }}>
        <Window url="calendar.google.com" width={1400} height={760}>
          <GoogleCalendarMock
            eventTop={eventTop}
            eventAlpha={eventAlpha}
            eventScale={eventScale}
            showPopover={showPopover}
            popoverAlpha={popoverAlpha}
          />
        </Window>
        <StatusChip text={chip.text} color={chip.color} alpha={chip.alpha} />
        {labelProgress > 0 && frame < 300 && (
          <CodeLabel
            text="calendar.events"
            progress={labelProgress}
            style={{ left: "50%", marginLeft: -110, top: 858 }}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
