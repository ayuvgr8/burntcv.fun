import React from "react";
import { FONT } from "./fonts";
import { COLORS } from "./theme";
import { Avatar, GreenBadge, Logo, MonoTag } from "./primitives";
import { Icon } from "./icons";

const softCard: React.CSSProperties = {
  background: COLORS.card,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 18,
};

// ── Bookings app (sidebar + list) ────────────────────────────────
const NAV = [
  { label: "Bookings", icon: Icon.CalendarCheck },
  { label: "Availability", icon: Icon.Clock },
  { label: "Briefs", icon: Icon.Sparkle },
  { label: "Booking links", icon: Icon.Link },
  { label: "Settings", icon: Icon.Gear },
];

export const BookingsAppMock: React.FC<{ activeNav?: number; briefReveal?: number }> = ({
  activeNav = 0,
  briefReveal = 1,
}) => (
  <div style={{ display: "flex", height: "100%", fontFamily: FONT.sans }}>
    <div
      style={{
        width: 250,
        background: COLORS.creamDeep,
        borderRight: `1px solid ${COLORS.line}`,
        padding: "26px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ paddingLeft: 6, marginBottom: 22 }}>
        <Logo size={30} />
      </div>
      {NAV.map((n, i) => {
        const active = i === activeNav;
        const I = n.icon;
        return (
          <div
            key={n.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 14px",
              borderRadius: 11,
              fontSize: 16,
              fontWeight: active ? 700 : 500,
              color: active ? COLORS.greenInk : COLORS.inkSoft,
              background: active ? COLORS.greenSoftBg : "transparent",
            }}
          >
            <I size={19} color={active ? COLORS.green : COLORS.inkSoft} />
            {n.label}
          </div>
        );
      })}
    </div>
    <div style={{ flex: 1, padding: "32px 38px", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: "0.12em", color: COLORS.inkDim, textTransform: "uppercase" }}>
            Upcoming today
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.02em", marginTop: 6 }}>
            Tuesday, 8 July
          </div>
        </div>
        <GreenBadge>3 bookings</GreenBadge>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 26 }}>
        <BookingRow
          initials="WB"
          color={COLORS.avGreen}
          name="Will Buyers"
          meta="10:00 · 30 min · Google Meet"
          highlight
          right={
            <GreenBadge style={{ opacity: briefReveal }}>
              <Icon.Sparkle size={15} color={COLORS.green} /> Brief ready
            </GreenBadge>
          }
        />
        <BookingRow
          initials="RS"
          color={COLORS.avCoral}
          name="Rohan Sharma"
          meta="13:30 · 45 min · Zoom"
          right={<MonoTag>Voice note</MonoTag>}
        />
        <BookingRow
          initials="AM"
          color={COLORS.avPurple}
          name="Aria Minaei"
          meta="16:00 · 30 min · Google Meet"
          right={<span style={{ color: COLORS.inkDim, fontSize: 15 }}>Confirmed</span>}
        />
      </div>
    </div>
  </div>
);

const BookingRow: React.FC<{
  initials: string;
  color: string;
  name: string;
  meta: string;
  right?: React.ReactNode;
  highlight?: boolean;
}> = ({ initials, color, name, meta, right, highlight }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "18px 20px",
      borderRadius: 16,
      background: highlight ? "rgba(46,162,78,0.05)" : COLORS.card,
      border: `1.5px solid ${highlight ? "rgba(46,162,78,0.5)" : COLORS.line}`,
      boxShadow: highlight ? "0 8px 30px -12px rgba(46,162,78,0.4)" : "none",
    }}
  >
    <Avatar initials={initials} size={46} color={color} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: COLORS.ink }}>{name}</div>
      <div style={{ fontSize: 15, color: COLORS.inkSoft, marginTop: 2 }}>{meta}</div>
    </div>
    {right}
  </div>
);

// ── The Claude meeting brief (the artifact) ──────────────────────
const BRIEF_POINTS = [
  "Ask about the current hiring bottleneck",
  "30 min may be tight — suggest a workshop",
  "Send a Loom on org design first",
];

export const BriefCard: React.FC<{ build?: number; width?: number }> = ({ build = 1, width = 620 }) => {
  const line = (i: number) => Math.max(0, Math.min(1, build * 5 - i));
  const flag = Math.max(0, Math.min(1, build * 5 - 3.4));
  const foot = Math.max(0, Math.min(1, build * 5 - 4.2));
  return (
    <div
      style={{
        width,
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 22,
        boxShadow: "0 40px 100px -30px rgba(0,0,0,0.28)",
        padding: "30px 34px",
        fontFamily: FONT.sans,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: COLORS.greenSoftBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon.Sparkle size={24} color={COLORS.green} />
        </div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.01em" }}>
            Meeting Brief · Sarah Chen
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: "0.1em", color: COLORS.inkDim, textTransform: "uppercase", marginTop: 3 }}>
            Intro call · Thu 10:00
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: COLORS.line, margin: "22px 0" }} />
      <div style={{ fontSize: 22, fontWeight: 600, color: COLORS.ink, opacity: line(0), transform: `translateY(${(1 - line(0)) * 8}px)` }}>
        Guest wants help scaling her design team from 4 → 9.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
        {BRIEF_POINTS.map((t, i) => {
          const o = line(i + 1);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, opacity: o, transform: `translateX(${(1 - o) * 12}px)` }}>
              <Icon.Check size={20} color={COLORS.green} strokeWidth={2.4} />
              <span style={{ fontSize: 19, color: COLORS.ink }}>{t}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 22,
          padding: "14px 18px",
          borderRadius: 12,
          background: "#FBF0DC",
          border: "1px solid rgba(200,150,60,0.3)",
          opacity: flag,
          transform: `translateY(${(1 - flag) * 8}px)`,
        }}
      >
        <Icon.Flag size={20} color="#C1892F" />
        <span style={{ fontSize: 17, color: "#8A6A26" }}>
          Sarah is in PST, you're in IST — confirm her morning works
        </span>
      </div>
      <div style={{ marginTop: 22, opacity: foot }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "9px 16px",
            borderRadius: 999,
            background: COLORS.greenSoftBg,
            color: COLORS.greenInk,
            fontFamily: FONT.sans,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <Icon.Sparkle size={16} color={COLORS.green} /> Generated by Claude · 2 hours before your call
        </span>
      </div>
    </div>
  );
};

// ── Guest voice-note capture ─────────────────────────────────────
export const VoiceNoteCard: React.FC<{ record?: number; width?: number }> = ({ record = 0, width = 560 }) => {
  const secs = Math.floor(record * 30);
  const timer = `0:${String(secs).padStart(2, "0")}`;
  const bars = 21;
  return (
    <div
      style={{
        width,
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 22,
        boxShadow: "0 40px 100px -30px rgba(0,0,0,0.28)",
        padding: "32px 34px",
        fontFamily: FONT.sans,
      }}
    >
      <div style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: "0.12em", color: COLORS.inkDim, textTransform: "uppercase" }}>
        One last thing
      </div>
      <div style={{ fontSize: 27, fontWeight: 800, color: COLORS.ink, marginTop: 8, letterSpacing: "-0.02em" }}>
        Add a 30-second voice note
      </div>
      <div style={{ fontSize: 17, color: COLORS.inkSoft, marginTop: 6 }}>
        Tell Alex what you'd like to cover. It becomes their prep.
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginTop: 26,
          padding: "20px 22px",
          borderRadius: 16,
          background: COLORS.creamDeep,
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: COLORS.greenBright,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: `0 0 ${record > 0 ? 26 : 0}px rgba(61,180,94,0.5)`,
          }}
        >
          <Icon.Mic size={26} color="#fff" />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, height: 46 }}>
          {Array.from({ length: bars }).map((_, i) => {
            const active = i / bars < record;
            const h = 8 + Math.abs(Math.sin(i * 1.7) * 30) * (0.5 + (active ? 0.5 : 0.1));
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: h,
                  borderRadius: 3,
                  background: active ? COLORS.green : COLORS.lineStrong,
                }}
              />
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 700, color: COLORS.ink, width: 52, textAlign: "right" }}>
          {timer}
        </div>
      </div>
    </div>
  );
};

// ── Mini booking row (before / after comparison) ─────────────────
export const MiniBooking: React.FC<{
  muted?: boolean;
  right?: React.ReactNode;
}> = ({ muted, right }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 20px",
      borderRadius: 14,
      background: muted ? "rgba(255,255,255,0.5)" : COLORS.card,
      border: `1px solid ${COLORS.line}`,
      fontFamily: FONT.sans,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: muted ? COLORS.creamDeep : COLORS.avGreen,
        flexShrink: 0,
      }}
    />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: muted ? COLORS.inkSoft : COLORS.ink }}>Sarah Chen</div>
      <div style={{ fontSize: 14, color: COLORS.inkDim }}>Thu · 10:00</div>
    </div>
    {right}
  </div>
);

// ── Dashboard app ────────────────────────────────────────────────
const DASH_NAV = [
  { label: "Dashboard", icon: Icon.Grid },
  { label: "Bookings", icon: Icon.CalendarCheck },
  { label: "Booking types", icon: Icon.Layers },
  { label: "Availability", icon: Icon.Clock },
  { label: "Payments", icon: Icon.Rupee },
  { label: "Store", icon: Icon.Bag },
];

export const DashboardAppMock: React.FC = () => (
  <div style={{ display: "flex", height: "100%", fontFamily: FONT.sans }}>
    <div
      style={{
        width: 240,
        background: COLORS.creamDeep,
        borderRight: `1px solid ${COLORS.line}`,
        padding: "26px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ paddingLeft: 6, marginBottom: 22 }}>
        <Logo size={30} />
      </div>
      {DASH_NAV.map((n, i) => {
        const active = i === 0;
        const I = n.icon;
        return (
          <div
            key={n.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 14px",
              borderRadius: 11,
              fontSize: 16,
              fontWeight: active ? 700 : 500,
              color: active ? COLORS.greenInk : COLORS.inkSoft,
              background: active ? COLORS.greenSoftBg : "transparent",
            }}
          >
            <I size={19} color={active ? COLORS.green : COLORS.inkSoft} />
            {n.label}
          </div>
        );
      })}
    </div>
    <div style={{ flex: 1, padding: "30px 36px", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.02em" }}>
            Good morning, Ayush
          </div>
          <div style={{ fontSize: 15, color: COLORS.inkDim, marginTop: 3 }}>Thursday · 3 calls today</div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 18px",
            borderRadius: 999,
            background: COLORS.pill,
            color: COLORS.onPill,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          + New booking type
        </span>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
        {[
          { k: "Bookings", v: "24", s: "↑ 12% this month" },
          { k: "Revenue", v: "₹18,500", s: "↑ ₹4,200" },
          { k: "Upcoming", v: "8", s: "next at 10:00" },
          { k: "Briefs ready", v: "3", s: "of 3 today" },
        ].map((st) => (
          <div key={st.k} style={{ ...softCard, flex: 1, padding: "18px 18px" }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 12, letterSpacing: "0.1em", color: COLORS.inkDim, textTransform: "uppercase" }}>
              {st.k}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.ink, margin: "6px 0 4px" }}>{st.v}</div>
            <div style={{ fontSize: 13, color: COLORS.green, fontWeight: 600 }}>{st.s}</div>
          </div>
        ))}
      </div>
      <div style={{ ...softCard, marginTop: 18, padding: "10px 20px" }}>
        <DashCall initials="RS" color={COLORS.avCoral} name="Rohan Sharma" meta="Strategy Call · Today 10:00" join />
        <div style={{ height: 1, background: COLORS.line }} />
        <DashCall initials="PN" color={COLORS.avPurple} name="Priya Nair" meta="Portfolio Review · Today 14:30" />
      </div>
    </div>
  </div>
);

const DashCall: React.FC<{ initials: string; color: string; name: string; meta: string; join?: boolean }> = ({
  initials,
  color,
  name,
  meta,
  join,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px" }}>
    <Avatar initials={initials} size={42} color={color} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink }}>{name}</div>
      <div style={{ fontSize: 14, color: COLORS.inkSoft, marginTop: 2 }}>{meta}</div>
    </div>
    <GreenBadge>
      {join ? <Icon.Sparkle size={14} color={COLORS.green} /> : <Icon.Mic size={14} color={COLORS.green} />}
      {join ? "Brief ready" : "Voice note"}
    </GreenBadge>
    <span
      style={{
        marginLeft: 6,
        padding: "9px 20px",
        borderRadius: 999,
        background: join ? COLORS.greenBright : "transparent",
        border: join ? "none" : `1px solid ${COLORS.lineStrong}`,
        color: join ? "#fff" : COLORS.ink,
        fontSize: 15,
        fontWeight: 600,
      }}
    >
      {join ? "Join" : "Prep"}
    </span>
  </div>
);

// ── Storefront product card ──────────────────────────────────────
export const StoreCard: React.FC<{ title: string; price: string; kind: "doc" | "template" | "video" | "bundle" }> = ({
  title,
  price,
  kind,
}) => (
  <div style={{ ...softCard, padding: 16, width: 260, fontFamily: FONT.sans }}>
    <div
      style={{
        height: 150,
        borderRadius: 12,
        background: kind === "video" ? "#14140F" : COLORS.creamDeep,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {kind === "doc" && <Icon.Doc size={54} color={COLORS.inkSoft} />}
      {kind === "template" && <Icon.Grid size={54} color={COLORS.green} />}
      {kind === "video" && (
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon.Play size={24} color={COLORS.ink} />
        </div>
      )}
      {kind === "bundle" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Icon.Doc size={44} color={COLORS.inkSoft} />
          <Icon.Waveform size={40} color={COLORS.green} />
        </div>
      )}
    </div>
    <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink }}>{title}</div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
      <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.ink }}>{price}</span>
      <span
        style={{
          padding: "9px 18px",
          borderRadius: 999,
          background: COLORS.pill,
          color: COLORS.onPill,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Buy now
      </span>
    </div>
  </div>
);

// ── Payments cards ───────────────────────────────────────────────
export const PaymentsCards: React.FC = () => (
  <div style={{ display: "flex", gap: 20, fontFamily: FONT.sans }}>
    <div style={{ ...softCard, width: 420, padding: "28px 30px" }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: "0.12em", color: COLORS.inkDim, textTransform: "uppercase" }}>
        Domestic
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.ink, marginTop: 10 }}>UPI, Razorpay & cards</div>
      <div style={{ fontSize: 16, color: COLORS.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
        Charge for calls and digital products with zero payment friction — clients pay the way they already pay.
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {["UPI", "Razorpay", "GST invoice"].map((t) => (
          <span key={t} style={{ padding: "8px 14px", borderRadius: 10, background: COLORS.creamDeep, border: `1px solid ${COLORS.line}`, fontSize: 14, fontWeight: 600, color: COLORS.inkSoft }}>
            {t}
          </span>
        ))}
      </div>
    </div>
    <div style={{ width: 420, padding: "28px 30px", borderRadius: 18, background: COLORS.stage, border: `1px solid ${COLORS.stageLine}` }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: "0.12em", color: COLORS.onStageDim, textTransform: "uppercase" }}>
        International
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.onStage, marginTop: 10 }}>Going global?</div>
      <div style={{ fontSize: 16, color: COLORS.onStageDim, marginTop: 8, lineHeight: 1.5 }}>
        Stripe & PayPal for international clients — same booking page, settled in their currency.
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {["Stripe", "PayPal", "Cards"].map((t) => (
          <span key={t} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.stageLine}`, fontSize: 14, fontWeight: 600, color: COLORS.onStage }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  </div>
);
