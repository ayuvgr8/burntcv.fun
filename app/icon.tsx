import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon: the 🔥 on a dark rounded tile.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0623",
          borderRadius: 14,
          fontSize: 40,
        }}
      >
        🔥
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
