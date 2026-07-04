"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { css } from "./css";
import { LEGAL } from "@/lib/legal";

// Rendered globally from app/layout.tsx so every route — landing, /linkedin,
// and all four policy pages — carries these links in the footer. Payment
// aggregators (Razorpay) require Terms, Privacy, Refund/Cancellation and
// Contact to be reachable from every page before they activate your account.
//
// Clicking a link opens the policy in a scrollable pop-up (an iframe of the
// real page in ?embed=1 mode — single source of truth, no duplicated copy),
// with an "Open full page" escape hatch. The links keep their real hrefs, so
// SEO, right-click, and ⌘/Ctrl-click still open the standalone page.

const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund & Cancellation" },
  { href: "/contact", label: "Contact" },
];

type Doc = { href: string; label: string };

export default function SiteFooter() {
  const [open, setOpen] = useState<Doc | null>(null);
  // Hide the footer when this page is itself rendered inside the pop-up iframe,
  // so the embedded policy doesn't carry a second footer (or a nested modal).
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true); // cross-origin access throws → we're framed
    }
  }, []);

  const close = useCallback(() => setOpen(null), []);

  // Lock body scroll + wire Escape-to-close while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (inIframe) return null;

  const onLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: Doc) => {
    // Let the browser handle new-tab intents (⌘/Ctrl/Shift/Alt + click).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(link);
  };

  return (
    <>
      <footer
        style={css(
          "border-top:1.5px solid rgba(15,6,35,.1);padding:26px 20px;background:#e9e7ec;",
        )}
      >
        <div
          style={css(
            "max-width:900px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 20px;",
          )}
        >
          <span
            style={css(
              "display:inline-flex;align-items:center;gap:7px;font-weight:900;font-size:15px;color:#0f0623;",
            )}
          >
            <span aria-hidden>🔥</span> BurntCV
          </span>

          <nav style={css("display:flex;flex-wrap:wrap;gap:8px 18px;")}>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={(e) => onLinkClick(e, l)}
                style={css(
                  "font-size:13px;font-weight:600;color:#4e3188;cursor:pointer;",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <span
            style={css(
              "flex-basis:100%;font-size:12px;color:#8a8693;line-height:1.6;",
            )}
          >
            © {new Date().getFullYear()} {LEGAL.entityName} · BurntCV is a satire /
            entertainment product. Roasts are AI-generated comedy — not
            professional, career, legal, or financial advice.
          </span>
        </div>
      </footer>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.label}
          onClick={close}
          style={css(
            "position:fixed;inset:0;z-index:120;background:rgba(15,6,35,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeup .18s ease;",
          )}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={css(
              "width:100%;max-width:660px;height:min(86vh,920px);background:#faf9f7;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 40px 90px -28px rgba(15,6,35,.65);",
            )}
          >
            <div
              style={css(
                "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px 11px 18px;border-bottom:1px solid rgba(15,6,35,.09);background:#fff;flex-shrink:0;",
              )}
            >
              <span style={css("font-weight:800;font-size:15px;color:#0f0623;")}>
                {open.label}
              </span>
              <div style={css("display:flex;align-items:center;gap:8px;")}>
                <a
                  href={open.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={css(
                    "font-size:12.5px;font-weight:700;color:#4e3188;text-decoration:none;background:rgba(78,49,136,.09);padding:8px 12px;border-radius:9px;white-space:nowrap;",
                  )}
                >
                  Open full page ↗
                </a>
                <button
                  onClick={close}
                  aria-label="Close"
                  style={css(
                    "border:none;background:rgba(15,6,35,.06);cursor:pointer;width:34px;height:34px;border-radius:9px;font-size:16px;color:#5a5a5a;line-height:1;flex-shrink:0;",
                  )}
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe
              src={`${open.href}?embed=1`}
              title={open.label}
              style={css("flex:1;width:100%;border:none;background:#faf9f7;")}
            />
          </div>
        </div>
      )}
    </>
  );
}
