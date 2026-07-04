import type { CSSProperties } from "react";

// Parse a CSS declaration string ("color:red;font-weight:700") into a React
// style object. Lets us keep the approved design's inline styles verbatim,
// preserving pixel fidelity without hand-converting every rule.
export function css(s: string): CSSProperties {
  const obj: Record<string, string> = {};
  for (const rule of s.split(";")) {
    const i = rule.indexOf(":");
    if (i < 0) continue;
    const key = rule
      .slice(0, i)
      .trim()
      .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const val = rule.slice(i + 1).trim();
    if (key) obj[key] = val;
  }
  return obj as CSSProperties;
}
