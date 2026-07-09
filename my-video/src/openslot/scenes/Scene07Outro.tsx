import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, EASE_OUT, riseIn } from "../theme";
import { LogoMark, Window, Wordmark } from "../primitives";
import {
  BookingMock,
  ConfirmationMock,
  DashboardMock,
  GoogleCalendarMock,
  Slot,
} from "../mocks";

const MeetTile: React.FC = () => (
  <div style={{ height: "100%", background: "#0B0B0F", display: "flex", flexDirection: "column", fontFamily: FONT.sans }}>
    <div style={{ height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 24px", color: COLORS.textMuted, fontSize: 18 }}>
      📹 Google Meet <span style={{ marginLeft: "auto", fontSize: 15 }}>rtc-vqzo-hng</span>
    </div>
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 20 }}>
      {[
        ["AK", "#7C6BFF", "#4CC2FF"],
        ["PA", "#4CC2FF", "#37D98A"],
      ].map(([ini, a, b]) => (
        <div key={ini} style={{ borderRadius: 16, background: "#131319", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.line}` }}>
          <div style={{ width: 92, height: 92, borderRadius: "50%", background: `linear-gradient(135deg, ${a}, ${b})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 34 }}>
            {ini}
          </div>
        </div>
      ))}
    </div>
    <div style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      {["🎤", "📷", "🖥️"].map((c) => (
        <div key={c} style={{ width: 46, height: 46, borderRadius: "50%", background: "#1B1B23", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: `1px solid ${COLORS.line}` }}>{c}</div>
      ))}
      <div style={{ width: 62, height: 46, borderRadius: 999, background: COLORS.danger, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📞</div>
    </div>
  </div>
);

const OUTRO_SLOTS: Slot[] = [
  { time: "9:00 AM", state: "busy" },
  { time: "9:30 AM", state: "free" },
  { time: "10:00 AM", state: "busy" },
  { time: "11:30 AM", state: "selected" },
  { time: "1:00 PM", state: "free" },
];

export const Scene07Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const CLIPS = [
    <Window key="d" url="app.openslot.io" width={1200} height={700}><DashboardMock /></Window>,
    <Window key="b" url="openslot.io/alex" width={1200} height={700}><BookingMock slots={OUTRO_SLOTS} activeDate={14} /></Window>,
    <Window key="c" url="calendar.google.com" width={1200} height={700}><GoogleCalendarMock eventTop={150} /></Window>,
    <Window key="f" url="openslot.io" width={1200} height={700}><ConfirmationMock check={1} /></Window>,
    <Window key="m" url="meet.google.com" width={1200} height={700}><MeetTile /></Window>,
  ];
  const SHOT = 20;

  const montageOut = interpolate(frame, [92, 106], [1, 0], clamp);

  // End card
  const cardOp = interpolate(frame, [100, 116], [0, 1], clamp);
  const cardScale = interpolate(frame, [100, 210], [0.97, 1.03], { ...clamp, easing: EASE_OUT });
  const logoScale = interpolate(frame, [100, 138], [0.55, 1], { ...clamp, easing: EASE_OUT });
  const word = riseIn(frame, 120, 20, 22);
  const tag = riseIn(frame, 140, 20, 18);
  const url = riseIn(frame, 158, 20, 16);

  return (
    <AbsoluteFill>
      {/* Montage */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: montageOut }}>
        {CLIPS.map((clip, i) => {
          const start = i * SHOT;
          const op = interpolate(frame, [start, start + 3, start + SHOT - 3, start + SHOT], [0, 1, 1, 0], clamp);
          const s = interpolate(frame, [start, start + SHOT], [1.0, 1.06], { ...clamp, easing: EASE_OUT });
          if (op <= 0.01) return null;
          return (
            <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: "center", opacity: op }}>
              <div style={{ scale: String(s) }}>{clip}</div>
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>

      {/* End card */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 26,
          opacity: cardOp,
          scale: String(cardScale),
        }}
      >
        <div style={{ scale: String(logoScale), filter: `drop-shadow(0 0 70px ${COLORS.glow})` }}>
          <LogoMark size={130} />
        </div>
        <div style={word}>
          <Wordmark size={92} />
        </div>
        <div
          style={{
            ...tag,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 36,
            color: COLORS.textMuted,
            letterSpacing: "-0.01em",
          }}
        >
          Scheduling that simply works.
        </div>
        <div
          style={{
            ...url,
            marginTop: 8,
            fontFamily: FONT.sans,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.accentSoft,
            padding: "12px 28px",
            borderRadius: 999,
            border: `1px solid rgba(124,107,255,0.4)`,
            background: "rgba(124,107,255,0.08)",
          }}
        >
          openslot.io
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
