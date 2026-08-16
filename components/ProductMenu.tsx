"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { css } from "./css";

// "Product ▾" nav dropdown — the suite switcher between the two sibling
// products (PRD-Hire §16: shared domain/nav is fine, shared promise is not).
// Each entry states its own data promise right in the menu.
const PRODUCTS = [
  {
    href: "/",
    emoji: "🔥",
    name: "BurntCV",
    tag: "Roast my résumé",
    desc: "The brutal truth, never stored.",
  },
  {
    href: "/pro",
    emoji: "🛡️",
    name: "BurntCV Pro",
    tag: "Beat the screen",
    desc: "See how the AI scores you against a JD. Never stored.",
  },
  {
    href: "/hire",
    emoji: "🎯",
    name: "BurntCV Hire",
    tag: "AI Recruiting",
    desc: "Evidence-cited screening for recruiters.",
  },
];

export default function ProductMenu({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const linkColor = dark ? "#e8e6f0" : "#0f0623";

  return (
    <div ref={ref} style={css("position:relative;")}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={css(
          `border:none;background:transparent;cursor:pointer;display:flex;align-items:center;gap:5px;font-weight:700;font-size:14px;color:${linkColor};padding:8px 10px;border-radius:10px;font-family:inherit;`,
        )}
      >
        Product
        <span
          style={css(
            `font-size:10px;transition:transform .15s ease;transform:rotate(${open ? 180 : 0}deg);`,
          )}
        >
          ▼
        </span>
      </button>
      {open && (
        <div
          role="menu"
          style={css(
            "position:absolute;top:calc(100% + 8px);right:0;z-index:90;width:290px;background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:16px;box-shadow:0 24px 60px -18px rgba(15,6,35,.35);padding:8px;display:flex;flex-direction:column;gap:2px;animation:fadeup .16s ease;",
          )}
        >
          {PRODUCTS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={css(
                "display:flex;gap:12px;align-items:flex-start;padding:11px 12px;border-radius:11px;text-decoration:none;color:#0f0623;",
              )}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(15,6,35,.045)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span style={css("font-size:20px;line-height:1.2;")}>{p.emoji}</span>
              <span style={css("display:flex;flex-direction:column;gap:1px;")}>
                <span style={css("display:flex;align-items:center;gap:7px;")}>
                  <span style={css("font-weight:800;font-size:14px;letter-spacing:-.01em;")}>
                    {p.name}
                  </span>
                  <span
                    style={css(
                      "font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#1a56db;background:rgba(26,86,219,.08);padding:2px 7px;border-radius:999px;",
                    )}
                  >
                    {p.tag}
                  </span>
                </span>
                <span style={css("font-size:12px;color:#7a7a85;line-height:1.4;")}>
                  {p.desc}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
