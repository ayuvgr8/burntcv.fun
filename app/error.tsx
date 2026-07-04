"use client";

// Graceful client error boundary — a roast-flavored fallback instead of a crash.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 40,
        textAlign: "center",
        background: "#f7f6f4",
        color: "#0f0623",
      }}
    >
      <div style={{ fontSize: 48 }}>🔥</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
        Well. That got roasted too.
      </h1>
      <p style={{ margin: 0, color: "#5a5a5a", fontSize: 15, maxWidth: 340, lineHeight: 1.5 }}>
        Something broke on our end. No résumés were harmed — try again.
      </p>
      <button
        onClick={reset}
        style={{
          border: "none",
          cursor: "pointer",
          padding: "14px 24px",
          borderRadius: 14,
          background: "linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89)",
          color: "#fff",
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        Try again
      </button>
    </div>
  );
}
