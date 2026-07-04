import { ImageResponse } from "next/og";

// LinkedIn-flavored link-preview card for /linkedin.
export const runtime = "nodejs";
export const alt = "LinkedIn Roast Generator — BurntCV";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0f0623",
          color: "#fff",
          padding: "72px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "-160px",
            left: "-120px",
            width: "560px",
            height: "560px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,119,181,.55), rgba(78,49,136,.12) 55%, transparent 72%)",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 900 }}>
            🔥 BurntCV
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 4,
              color: "#0077b5",
              fontWeight: 700,
              border: "2px solid rgba(0,119,181,.6)",
              borderRadius: 999,
              padding: "8px 20px",
            }}
          >
            LINKEDIN ROAST
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 60,
            fontSize: 58,
            lineHeight: 1.12,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            maxWidth: 1000,
          }}
        >
          Your LinkedIn is a cringe goldmine. Let&apos;s roast it.
        </div>

        <div style={{ display: "flex", height: 2, background: "rgba(255,255,255,.15)", margin: "44px 0" }} />

        <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#f98731", fontWeight: 700 }}>
          🌑 DARK TRUTH
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 30,
            lineHeight: 1.4,
            color: "rgba(255,255,255,.92)",
            maxWidth: 1000,
          }}
        >
          500+ connections, 2% engagement — a network the size of a small town that collectively
          ignores you.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginTop: "auto",
            fontSize: 26,
            color: "rgba(255,255,255,.6)",
          }}
        >
          <div style={{ display: "flex" }}>burntcv.app/linkedin</div>
          <div style={{ display: "flex", color: "#fff", fontWeight: 700 }}>roast yours →</div>
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
