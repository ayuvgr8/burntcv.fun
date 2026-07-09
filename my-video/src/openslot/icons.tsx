import React from "react";

// Clean line-style icon set (currentColor-driven) replacing all emoji usage.
// 24×24 viewBox, 1.8 stroke, round joins — matching openslot.space iconography.

type P = { size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties };

const Svg: React.FC<P & { children: React.ReactNode; fill?: string }> = ({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.8,
  style,
  children,
  fill = "none",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {children}
  </svg>
);

export const Icon = {
  Sparkle: (p: P) => (
    <Svg {...p} fill={p.color ?? "currentColor"} strokeWidth={0}>
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
      <path d="M18.5 3.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" opacity="0.8" />
    </Svg>
  ),
  Mic: (p: P) => (
    <Svg {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </Svg>
  ),
  Clock: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  ),
  Video: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="6" width="12" height="12" rx="3" />
      <path d="M15 10l6-3v10l-6-3" />
    </Svg>
  ),
  Globe: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 2.4 14.7 0 17M12 3.5c-2.4 2.3-2.4 14.7 0 17" />
    </Svg>
  ),
  Calendar: (p: P) => (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </Svg>
  ),
  CalendarCheck: (p: P) => (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3M9 14.5l2 2 4-4" />
    </Svg>
  ),
  Check: (p: P) => (
    <Svg {...p}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  ),
  Flag: (p: P) => (
    <Svg {...p}>
      <path d="M6 21V4M6 4h11l-2 3.5L17 11H6" />
    </Svg>
  ),
  Card: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="M3 10h18M7 15h4" />
    </Svg>
  ),
  Bag: (p: P) => (
    <Svg {...p}>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  ),
  Arrow: (p: P) => (
    <Svg {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  ),
  Play: (p: P) => (
    <Svg {...p} fill={p.color ?? "currentColor"} strokeWidth={0}>
      <path d="M7 5.5v13l11-6.5-11-6.5z" />
    </Svg>
  ),
  Link: (p: P) => (
    <Svg {...p}>
      <path d="M9.5 14.5l5-5M8 11l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2" />
    </Svg>
  ),
  Gear: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3" />
    </Svg>
  ),
  Layers: (p: P) => (
    <Svg {...p}>
      <path d="M12 3l8.5 4.5L12 12 3.5 7.5 12 3z" />
      <path d="M4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5" />
    </Svg>
  ),
  Grid: (p: P) => (
    <Svg {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </Svg>
  ),
  Doc: (p: P) => (
    <Svg {...p}>
      <path d="M6 3h8l4 4v14H6V3z" />
      <path d="M14 3v4h4M9 12h6M9 15.5h6M9 8.5h2" />
    </Svg>
  ),
  Rupee: (p: P) => (
    <Svg {...p}>
      <path d="M7 5h10M7 9h10M9 5c4 0 4 8 0 8h-2l6 6" />
    </Svg>
  ),
  User: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  ),
  Lock: (p: P) => (
    <Svg {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </Svg>
  ),
  Bolt: (p: P) => (
    <Svg {...p} fill={p.color ?? "currentColor"} strokeWidth={0}>
      <path d="M13 2L4 13h6l-1 9 9-11h-6l1-9z" />
    </Svg>
  ),
  Waveform: (p: P) => (
    <Svg {...p}>
      <path d="M4 12v0M7 8v8M10 5v14M13 9v6M16 6.5v11M19 10v4M22 12v0" />
    </Svg>
  ),
};
