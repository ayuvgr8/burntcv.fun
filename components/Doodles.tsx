"use client";

// Hand-drawn-style job-hunt doodles (paper plane, target, briefcase, trophy)
// used as faint decorative accents in otherwise-empty desktop corners.
// Hidden below 1024px via the .bcv-doodle class; pointer-events none always.

function wrap(node: React.ReactNode, pos: string, size: number, rotate = 0) {
  return (
    <span
      className="bcv-doodle"
      aria-hidden
      style={{
        position: "absolute",
        pointerEvents: "none",
        opacity: 0.5,
        transform: `rotate(${rotate}deg)`,
        width: size,
        height: size,
        ...Object.fromEntries(
          pos.split(";").filter(Boolean).map((r) => r.split(":").map((s) => s.trim())),
        ),
      }}
    >
      {node}
    </span>
  );
}

const stroke = { fill: "none", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function DoodlePlane({ pos, size = 74, rotate = 0, color = "#c9b8ef" }: { pos: string; size?: number; rotate?: number; color?: string }) {
  return wrap(
    <svg viewBox="0 0 64 64" width="100%" height="100%">
      <path {...stroke} stroke={color} d="M6 30 L56 12 L38 52 L30 36 Z" strokeDasharray="3 3" />
      <path {...stroke} stroke={color} d="M30 36 L56 12" />
      <path {...stroke} stroke={color} d="M8 44 C14 42 18 44 20 48 M4 52 C10 50 14 52 16 56" opacity=".7" />
    </svg>,
    pos,
    size,
    rotate,
  );
}

export function DoodleTarget({ pos, size = 70, rotate = 0, color = "#f3b0b6" }: { pos: string; size?: number; rotate?: number; color?: string }) {
  return wrap(
    <svg viewBox="0 0 64 64" width="100%" height="100%">
      <circle {...stroke} stroke={color} cx="30" cy="34" r="20" strokeDasharray="4 3" />
      <circle {...stroke} stroke={color} cx="30" cy="34" r="11" />
      <circle cx="30" cy="34" r="3" fill={color} />
      <path {...stroke} stroke={color} d="M30 34 L52 12 M52 12 L44 13 M52 12 L51 20" />
    </svg>,
    pos,
    size,
    rotate,
  );
}

export function DoodleBriefcase({ pos, size = 64, rotate = 0, color = "#f5c67e" }: { pos: string; size?: number; rotate?: number; color?: string }) {
  return wrap(
    <svg viewBox="0 0 64 64" width="100%" height="100%">
      <rect {...stroke} stroke={color} x="10" y="22" width="44" height="30" rx="6" strokeDasharray="4 3" />
      <path {...stroke} stroke={color} d="M24 22 v-4 a4 4 0 0 1 4-4 h8 a4 4 0 0 1 4 4 v4 M10 36 h44" />
      <rect x="28" y="33" width="8" height="7" rx="2" fill={color} />
    </svg>,
    pos,
    size,
    rotate,
  );
}

export function DoodleTrophy({ pos, size = 66, rotate = 0, color = "#9ed0b5" }: { pos: string; size?: number; rotate?: number; color?: string }) {
  return wrap(
    <svg viewBox="0 0 64 64" width="100%" height="100%">
      <path {...stroke} stroke={color} d="M22 12 h20 v14 a10 10 0 0 1-20 0 Z" strokeDasharray="4 3" />
      <path {...stroke} stroke={color} d="M22 16 h-8 a8 8 0 0 0 8 10 M42 16 h8 a8 8 0 0 1-8 10 M32 36 v8 M24 50 h16 M26 44 h12" />
      <path {...stroke} stroke={color} d="M50 40 l2-4 2 4-2 4 Z" opacity=".8" />
    </svg>,
    pos,
    size,
    rotate,
  );
}
