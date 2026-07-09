import { FONT_DATA } from "./fontData";

// Gabarito (rounded grotesque, brand headings + body) and Space Mono (eyebrow
// labels), embedded as base64 data URIs and registered via an injected
// @font-face stylesheet. Data URIs decode synchronously with no network fetch —
// which keeps renders offline and avoids the concurrency stall.

export const FONT = {
  sans: "Gabarito, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'Space Mono', ui-monospace, SFMono-Regular, monospace",
} as const;

const SANS_WEIGHTS = ["400", "500", "600", "700", "800", "900"] as const;
const MONO_WEIGHTS = ["400", "700"] as const;

let injected = false;

export const loadFonts = () => {
  if (injected || typeof document === "undefined") return;
  injected = true;

  const faces = SANS_WEIGHTS.map(
    (w) => `@font-face{font-family:'Gabarito';font-style:normal;font-weight:${w};
      font-display:block;src:url(${FONT_DATA[`gabarito-${w}`]}) format('woff2');}`,
  );
  MONO_WEIGHTS.forEach((w) =>
    faces.push(`@font-face{font-family:'Space Mono';font-style:normal;font-weight:${w};
      font-display:block;src:url(${FONT_DATA[`mono-${w}`]}) format('woff2');}`),
  );

  const style = document.createElement("style");
  style.setAttribute("data-openslot-fonts", "true");
  style.textContent = faces.join("\n");
  document.head.appendChild(style);

  if (document.fonts) {
    SANS_WEIGHTS.forEach((w) => {
      try {
        document.fonts.load(`${w} 16px Gabarito`);
      } catch {
        /* no-op */
      }
    });
    MONO_WEIGHTS.forEach((w) => {
      try {
        document.fonts.load(`${w} 16px 'Space Mono'`);
      } catch {
        /* no-op */
      }
    });
  }
};
