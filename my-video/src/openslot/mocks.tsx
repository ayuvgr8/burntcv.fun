import React from "react";
import { FONT } from "./fonts";
import { COLORS } from "./theme";
import { GoogleG, LogoMark } from "./primitives";

const card: React.CSSProperties = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 18,
};

const Avatar: React.FC<{ initials: string; size?: number; from?: string; to?: string }> = ({
  initials,
  size = 44,
  from = "#7C6BFF",
  to = "#4CC2FF",
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${from}, ${to})`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT.sans,
      fontWeight: 700,
      fontSize: size * 0.4,
      color: "#fff",
      flexShrink: 0,
    }}
  >
    {initials}
  </div>
);

// ── Dashboard ────────────────────────────────────────────────────
export const DashboardMock: React.FC = () => {
  const nav = ["Event Types", "Availability", "Bookings", "Integrations"];
  const bookings = [
    { who: "Priya Anand", when: "Today · 2:30 PM", tag: "Intro Call" },
    { who: "Marcus Lee", when: "Tomorrow · 10:00 AM", tag: "Product Demo" },
    { who: "Sofia Reyes", when: "Thu · 4:00 PM", tag: "1:1 Sync" },
  ];
  return (
    <div style={{ display: "flex", height: "100%", fontFamily: FONT.sans }}>
      {/* sidebar */}
      <div
        style={{
          width: 240,
          background: COLORS.surfaceLo,
          borderRight: `1px solid ${COLORS.line}`,
          padding: "26px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingLeft: 6 }}>
          <LogoMark size={30} />
          <span style={{ fontWeight: 700, fontSize: 20, color: COLORS.text, letterSpacing: "-0.02em" }}>
            OpenSlot
          </span>
        </div>
        {nav.map((n, i) => (
          <div
            key={n}
            style={{
              padding: "11px 14px",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: i === 1 ? 600 : 500,
              color: i === 1 ? COLORS.text : COLORS.textMuted,
              background: i === 1 ? "rgba(124,107,255,0.14)" : "transparent",
            }}
          >
            {n}
          </div>
        ))}
      </div>
      {/* main */}
      <div style={{ flex: 1, padding: "34px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, color: COLORS.textDim, marginBottom: 4 }}>Good morning</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.02em" }}>
              Your week at a glance
            </div>
          </div>
          <Avatar initials="AK" />
        </div>
        {/* stat row */}
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { k: "Bookings", v: "12", s: "this week" },
            { k: "Hours saved", v: "6.5", s: "this week" },
            { k: "Calendars", v: "3", s: "connected" },
          ].map((st) => (
            <div key={st.k} style={{ ...card, flex: 1, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, color: COLORS.textMuted }}>{st.k}</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: COLORS.text, margin: "4px 0" }}>
                {st.v}
              </div>
              <div style={{ fontSize: 13, color: COLORS.textDim }}>{st.s}</div>
            </div>
          ))}
        </div>
        {/* upcoming */}
        <div style={{ ...card, flex: 1, padding: "22px 24px", minHeight: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: COLORS.text, marginBottom: 14 }}>
            Upcoming bookings
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bookings.map((b) => (
              <div key={b.who} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar initials={b.who[0]} size={38} from="#4CC2FF" to="#7C6BFF" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>{b.who}</div>
                  <div style={{ fontSize: 14, color: COLORS.textDim }}>{b.when}</div>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: COLORS.accentSoft,
                    background: "rgba(124,107,255,0.12)",
                    border: `1px solid rgba(124,107,255,0.25)`,
                    padding: "5px 12px",
                    borderRadius: 999,
                  }}
                >
                  {b.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Homepage ─────────────────────────────────────────────────────
export const HomepageMock: React.FC<{ press?: number }> = ({ press = 0 }) => (
  <div
    style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT.sans,
      gap: 26,
      padding: 40,
    }}
  >
    <LogoMark size={72} />
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.text,
          letterSpacing: "-0.035em",
          lineHeight: 1.05,
        }}
      >
        Scheduling, simplified.
      </div>
      <div style={{ fontSize: 22, color: COLORS.textMuted, marginTop: 14 }}>
        Share one link. Let your calendar do the rest.
      </div>
    </div>
    <button
      style={{
        marginTop: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 30px",
        borderRadius: 14,
        border: "none",
        background: "#fff",
        color: "#1F1F1F",
        fontFamily: FONT.sans,
        fontSize: 20,
        fontWeight: 600,
        cursor: "pointer",
        scale: String(1 - press * 0.04),
        boxShadow: `0 0 ${40 + press * 40}px -8px ${COLORS.glow}`,
      }}
    >
      <GoogleG size={24} />
      Continue with Google
    </button>
    <div style={{ fontSize: 15, color: COLORS.textDim }}>Free forever · No credit card</div>
  </div>
);

// ── Google OAuth consent ─────────────────────────────────────────
const PERMISSIONS = [
  { title: "See the list of your calendars", scope: "Calendar List", icon: "📅" },
  { title: "View your availability (free / busy)", scope: "Free / Busy", icon: "🕒" },
  { title: "Create and manage calendar events", scope: "Calendar Events", icon: "✏️" },
];

export const ConsentMock: React.FC<{ reveal?: number; highlight?: number }> = ({
  reveal = 3,
  highlight = -1,
}) => (
  <div
    style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#101014",
      fontFamily: FONT.sans,
    }}
  >
    <div
      style={{
        width: 560,
        background: "#1C1C22",
        borderRadius: 20,
        border: `1px solid ${COLORS.line}`,
        padding: "34px 40px",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <GoogleG size={26} />
        <span style={{ fontSize: 20, color: "#E8E8ED", fontWeight: 500 }}>Sign in with Google</span>
      </div>
      <div style={{ fontSize: 27, fontWeight: 600, color: "#F1F1F4", marginTop: 18, letterSpacing: "-0.02em" }}>
        OpenSlot wants access to your Google Account
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, color: COLORS.textMuted, fontSize: 16 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#7C6BFF,#4CC2FF)" }} />
        alex@company.com
      </div>
      <div style={{ height: 1, background: COLORS.line, margin: "22px 0" }} />
      <div style={{ fontSize: 15, color: COLORS.textDim, marginBottom: 14 }}>
        This will allow OpenSlot to:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PERMISSIONS.map((p, i) => {
          const shown = i < reveal;
          const hot = highlight === i;
          return (
            <div
              key={p.scope}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "13px 16px",
                borderRadius: 12,
                background: hot ? "rgba(124,107,255,0.14)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${hot ? "rgba(124,107,255,0.5)" : COLORS.line}`,
                boxShadow: hot ? `0 0 26px -6px ${COLORS.glow}` : "none",
                opacity: shown ? 1 : 0.25,
                scale: String(hot ? 1.015 : 1),
              }}
            >
              <span style={{ fontSize: 22 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, color: "#EDEDF2", fontWeight: 500 }}>{p.title}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 13, color: hot ? COLORS.accentSoft : COLORS.textDim }}>
                  {p.scope}
                </div>
              </div>
              <span style={{ color: hot ? COLORS.accent : COLORS.textDim, fontSize: 18 }}>ⓘ</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 26 }}>
        <button style={ghostBtn}>Cancel</button>
        <button style={googleBtn}>Allow</button>
      </div>
    </div>
  </div>
);

const ghostBtn: React.CSSProperties = {
  padding: "11px 22px",
  borderRadius: 10,
  background: "transparent",
  border: "none",
  color: COLORS.google.blue,
  fontFamily: FONT.sans,
  fontSize: 16,
  fontWeight: 600,
};
const googleBtn: React.CSSProperties = {
  padding: "11px 26px",
  borderRadius: 10,
  background: COLORS.google.blue,
  border: "none",
  color: "#fff",
  fontFamily: FONT.sans,
  fontSize: 16,
  fontWeight: 600,
};

// ── Calendar list selection ──────────────────────────────────────
const CALS = [
  { name: "Personal", email: "alex@gmail.com", color: "#7C6BFF" },
  { name: "Work", email: "alex@company.com", color: "#4CC2FF" },
  { name: "Team Calendar", email: "team@company.com", color: "#37D98A" },
  { name: "Holidays", email: "Read-only", color: "#FBBC05", locked: true },
];

export const CalendarListMock: React.FC<{ selected?: boolean[] }> = ({
  selected = [false, false, false],
}) => (
  <div style={{ height: "100%", display: "flex", justifyContent: "center", padding: "44px 0", fontFamily: FONT.sans }}>
    <div style={{ width: 700 }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.02em" }}>
        Choose calendars to check
      </div>
      <div style={{ fontSize: 18, color: COLORS.textMuted, marginTop: 8, marginBottom: 28 }}>
        OpenSlot reads these to know when you're busy. It never writes to them.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CALS.map((c, i) => {
          const on = selected[i] ?? false;
          return (
            <div
              key={c.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "18px 22px",
                borderRadius: 14,
                background: on ? "rgba(124,107,255,0.10)" : COLORS.surface,
                border: `1px solid ${on ? "rgba(124,107,255,0.55)" : COLORS.line}`,
                boxShadow: on ? `0 0 34px -8px ${COLORS.glow}` : "none",
                opacity: c.locked ? 0.5 : 1,
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 4, background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 19, fontWeight: 600, color: COLORS.text }}>{c.name}</div>
                <div style={{ fontSize: 15, color: COLORS.textDim }}>{c.email}</div>
              </div>
              {c.locked ? (
                <span style={{ fontSize: 15, color: COLORS.textDim }}>🔒</span>
              ) : (
                <Checkbox on={on} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const Checkbox: React.FC<{ on: boolean }> = ({ on }) => (
  <div
    style={{
      width: 30,
      height: 30,
      borderRadius: 9,
      border: `2px solid ${on ? COLORS.accent : COLORS.lineStrong}`,
      background: on ? COLORS.accent : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {on && (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M5 12l5 5 9-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </div>
);

// ── Booking / availability page ──────────────────────────────────
export type Slot = { time: string; state: "free" | "busy" | "selected" };

export const BookingMock: React.FC<{
  slots: Slot[];
  activeDate?: number;
}> = ({ slots, activeDate = 14 }) => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <div style={{ height: "100%", display: "flex", fontFamily: FONT.sans }}>
      {/* left: meeting info */}
      <div
        style={{
          width: 320,
          borderRight: `1px solid ${COLORS.line}`,
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMark size={34} />
          <span style={{ fontSize: 17, color: COLORS.textMuted, fontWeight: 600 }}>Alex Kim</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.02em" }}>
          30 Min Meeting
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
          <InfoRow icon="🕒" text="30 minutes" />
          <InfoRow icon="📹" text="Google Meet" />
          <InfoRow icon="🌐" text="America / New York" />
        </div>
      </div>
      {/* right: date + slots */}
      <div style={{ flex: 1, padding: "34px 34px", display: "flex", gap: 28 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>
            September 2025
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 13, color: COLORS.textDim, paddingBottom: 6 }}>
                {d}
              </div>
            ))}
            {days.map((d) => {
              const on = d === activeDate;
              const disabled = d < 8 || d % 7 === 0;
              return (
                <div
                  key={d}
                  style={{
                    height: 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    fontSize: 16,
                    fontWeight: on ? 700 : 500,
                    color: on ? "#fff" : disabled ? COLORS.textDim : COLORS.text,
                    background: on ? COLORS.accent : disabled ? "transparent" : "rgba(255,255,255,0.04)",
                    boxShadow: on ? `0 0 24px -4px ${COLORS.glow}` : "none",
                  }}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>
        {/* time column */}
        <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 16, color: COLORS.textMuted, fontWeight: 600, marginBottom: 4 }}>
            Sun, Sep {activeDate}
          </div>
          {slots.map((s, i) => (
            <TimeSlot key={i} slot={s} />
          ))}
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 17, color: COLORS.textMuted }}>
    <span>{icon}</span>
    {text}
  </div>
);

const TimeSlot: React.FC<{ slot: Slot }> = ({ slot }) => {
  const base: React.CSSProperties = {
    height: 50,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
    fontWeight: 600,
    position: "relative",
  };
  if (slot.state === "busy")
    return (
      <div style={{ ...base, background: COLORS.busy, color: COLORS.textDim, border: `1px solid ${COLORS.line}` }}>
        <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{slot.time}</span>
      </div>
    );
  if (slot.state === "selected")
    return (
      <div style={{ ...base, background: COLORS.accent, color: "#fff", boxShadow: `0 0 30px -6px ${COLORS.glow}` }}>
        {slot.time}
      </div>
    );
  return (
    <div style={{ ...base, background: "transparent", color: COLORS.text, border: `1.5px solid rgba(124,107,255,0.55)` }}>
      {slot.time}
    </div>
  );
};

// ── Confirmation ─────────────────────────────────────────────────
export const ConfirmationMock: React.FC<{ check?: number }> = ({ check = 1 }) => (
  <div
    style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT.sans,
      gap: 20,
      padding: 40,
    }}
  >
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: "50%",
        background: "rgba(55,217,138,0.14)",
        border: `2px solid ${COLORS.success}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        scale: String(0.6 + check * 0.4),
        boxShadow: `0 0 ${check * 60}px -10px ${COLORS.success}`,
      }}
    >
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12.5l5 5 11-12"
          stroke={COLORS.success}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="40"
          strokeDashoffset={40 - check * 40}
        />
      </svg>
    </div>
    <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.03em" }}>
      You're booked!
    </div>
    <div style={{ fontSize: 20, color: COLORS.textMuted }}>
      30 Min Meeting · Sun, Sep 14 · 11:30 AM
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 22px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${COLORS.line}`,
        color: COLORS.text,
        fontSize: 17,
        marginTop: 6,
      }}
    >
      <span style={{ fontSize: 20 }}>📹</span> meet.google.com/rtc-vqzo-hng
    </div>
  </div>
);

// ── Google Calendar ──────────────────────────────────────────────
export const GoogleCalendarMock: React.FC<{
  eventTop?: number; // px offset of the event block
  eventAlpha?: number;
  eventScale?: number;
  showPopover?: boolean;
  popoverAlpha?: number;
}> = ({ eventTop = 150, eventAlpha = 1, eventScale = 1, showPopover = false, popoverAlpha = 1 }) => {
  const hours = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM"];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: FONT.sans, background: "#0F0F14" }}>
      {/* google cal header */}
      <div
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 26px",
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        <span style={{ fontSize: 26 }}>📅</span>
        <span style={{ fontSize: 20, color: COLORS.text, fontWeight: 500 }}>Calendar</span>
        <span style={{ marginLeft: 18, fontSize: 17, color: COLORS.textMuted }}>September 14, 2025</span>
      </div>
      {/* day grid */}
      <div style={{ flex: 1, position: "relative", padding: "10px 0" }}>
        {hours.map((h, i) => (
          <div key={h} style={{ display: "flex", height: 62, alignItems: "flex-start" }}>
            <div style={{ width: 90, textAlign: "right", paddingRight: 16, fontSize: 14, color: COLORS.textDim, marginTop: -8 }}>
              {h}
            </div>
            <div style={{ flex: 1, borderTop: `1px solid ${COLORS.line}` }} />
          </div>
        ))}
        {/* event block */}
        {eventAlpha > 0.01 && (
          <div
            style={{
              position: "absolute",
              left: 106,
              right: 40,
              top: eventTop,
              height: 96,
              borderRadius: 12,
              background: "linear-gradient(135deg, rgba(124,107,255,0.9), rgba(91,73,224,0.9))",
              border: "1px solid rgba(255,255,255,0.25)",
              padding: "12px 16px",
              boxShadow: `0 10px 40px -10px ${COLORS.glow}`,
              opacity: eventAlpha,
              scale: String(eventScale),
              transformOrigin: "center",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>30 Min Meeting</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>with Priya Anand</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, fontSize: 13, color: "#fff" }}>
              <span>📹</span> Google Meet
            </div>
          </div>
        )}
        {/* event detail popover */}
        {showPopover && (
          <div
            style={{
              position: "absolute",
              right: 40,
              top: eventTop + 20,
              width: 300,
              background: COLORS.surfaceHi,
              borderRadius: 16,
              border: `1px solid ${COLORS.lineStrong}`,
              padding: "20px 22px",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.8)",
              opacity: popoverAlpha,
              zIndex: 5,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>30 Min Meeting</div>
            <div style={{ fontSize: 15, color: COLORS.textMuted, marginTop: 4 }}>11:30 – 12:00 PM</div>
            <button
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: COLORS.google.blue,
                color: "#fff",
                fontFamily: FONT.sans,
                fontSize: 16,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              📹 Join with Google Meet
            </button>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, color: COLORS.textDim, marginTop: 10, textAlign: "center" }}>
              meet.google.com/rtc-vqzo-hng
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Privacy page ─────────────────────────────────────────────────
export const PrivacyMock: React.FC<{ shield?: number }> = ({ shield = 1 }) => (
  <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: 40, fontFamily: FONT.sans }}>
    <div style={{ width: 640, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <div
        style={{
          scale: String(0.7 + shield * 0.3),
          filter: `drop-shadow(0 0 ${shield * 40}px ${COLORS.glow})`,
        }}
      >
        <svg width="88" height="88" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"
            fill="rgba(124,107,255,0.14)"
            stroke={COLORS.accent}
            strokeWidth="1.4"
          />
          <path
            d="M8.5 12l2.5 2.5 5-5.5"
            stroke={COLORS.accentSoft}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="20"
            strokeDashoffset={20 - shield * 20}
          />
        </svg>
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.03em", textAlign: "center" }}>
        Your data stays yours
      </div>
      {/* connected account card */}
      <div
        style={{
          width: "100%",
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "18px 22px",
        }}
      >
        <Avatar initials="AK" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>alex@company.com</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: COLORS.success, marginTop: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.success }} />
            Connected · 3 calendars
          </div>
        </div>
        <button
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            background: "transparent",
            border: `1px solid ${COLORS.danger}`,
            color: COLORS.danger,
            fontFamily: FONT.sans,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Disconnect
        </button>
      </div>
    </div>
  </div>
);

const cardStyle: React.CSSProperties = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 16,
};
