"use client";

import { css } from "./css";

// Magic-UI-style "dia text reveal": each letter fades/rises in on its own
// delay and keeps a color cycled from the palette. Pure CSS animation
// (`bcvLetter` in globals.css) — no dependencies, safe under SSR.
export default function LetterReveal({
  text,
  colors,
  delay = 0,
  duration = 1.2,
  style = "",
}: {
  text: string;
  colors: string[];
  delay?: number; // seconds before the first letter starts
  duration?: number; // total seconds across the whole word
  style?: string; // extra inline CSS for the wrapper
}) {
  const letters = Array.from(text);
  const step = letters.length > 1 ? duration / letters.length : 0;
  return (
    <span style={css("display:inline-block;white-space:pre-wrap;" + style)} aria-label={text}>
      {letters.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          style={css(
            `display:inline-block;opacity:0;color:${colors[i % colors.length]};animation:bcvLetter .55s cubic-bezier(.22,1,.36,1) ${(
              delay + i * step
            ).toFixed(2)}s forwards;`,
          )}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
