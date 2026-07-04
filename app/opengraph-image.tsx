import { ImageResponse } from "next/og";

// Branded link-preview card — the billboard that shows up in feeds (PRD §6/§13).
export const runtime = "nodejs";
export const alt = "BurntCV — get your résumé roasted";
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
              "radial-gradient(circle, rgba(249,135,49,.55), rgba(237,50,55,.12) 55%, transparent 72%)",
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
              color: "#f98731",
              fontWeight: 700,
              border: "2px solid rgba(249,135,49,.5)",
              borderRadius: 999,
              padding: "8px 20px",
            }}
          >
            MEDIUM ROAST
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 70,
            fontSize: 60,
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            maxWidth: 980,
          }}
        >
          “A document that confidently says nothing, in Calibri.”
        </div>

        <div style={{ display: "flex", height: 2, background: "rgba(255,255,255,.15)", margin: "48px 0" }} />

        <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#f98731", fontWeight: 700 }}>
          🌑 DARK TRUTH
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 30, lineHeight: 1.4, color: "rgba(255,255,255,.92)", maxWidth: 980 }}>
          The two-year gap is the most honest line on the page. The ATS bot, tragically, has no soul.
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
          <div style={{ display: "flex" }}>burntcv.app</div>
          <div style={{ display: "flex", color: "#fff", fontWeight: 700 }}>roast yours →</div>
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
