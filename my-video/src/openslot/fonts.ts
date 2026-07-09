import { FONT_DATA } from "./fontData";

// Inter + JetBrains Mono are embedded as base64 data URIs (see fontData.ts) and
// registered via an injected @font-face stylesheet. Because the sources are
// data URIs, the browser decodes them synchronously on first use — so no
// delayRender()/network fetch is involved, which is what stalled the render
// pipeline under concurrency.

export const FONT = {
  sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
} as const;

const INTER_WEIGHTS = ["400", "500", "600", "700", "800", "900"] as const;

let injected = false;

export const loadFonts = () => {
  if (injected || typeof document === "undefined") return;
  injected = true;

  const faces = INTER_WEIGHTS.map(
    (w) => `@font-face{font-family:'Inter';font-style:normal;font-weight:${w};
      font-display:block;src:url(${FONT_DATA[`inter-${w}`]}) format('woff2');}`,
  );
  faces.push(
    `@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:500;
      font-display:block;src:url(${FONT_DATA["mono-500"]}) format('woff2');}`,
  );

  const style = document.createElement("style");
  style.setAttribute("data-openslot-fonts", "true");
  style.textContent = faces.join("\n");
  document.head.appendChild(style);

  // Kick decoding immediately (non-blocking) so early frames have the faces.
  if (document.fonts) {
    INTER_WEIGHTS.forEach((w) => {
      try {
        document.fonts.load(`${w} 16px Inter`);
      } catch {
        /* no-op */
      }
    });
    try {
      document.fonts.load(`500 16px 'JetBrains Mono'`);
    } catch {
      /* no-op */
    }
  }
};
