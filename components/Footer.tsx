"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { css } from "./css";
import { OPERATOR, OPERATOR_LOCATION } from "@/lib/operator";

const LINKS: { href: string; label: string }[] = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refunds" },
  { href: "/shipping", label: "Delivery" },
  { href: "/contact", label: "Contact" },
];

type Doc = { href: string; label: string };

// Site-wide footer. Carries the operator identity + policy links Razorpay
// looks for during merchant activation. Clicking a policy link opens it in a
// scrollable pop-up (an iframe of the real page in ?embed=1 mode — single
// source of truth, no duplicated copy) with an "Open full page" escape hatch.
// Links keep their real hrefs, so SEO, right-click, and ⌘/Ctrl-click still open
// the standalone page.
export default function Footer() {
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
          "border-top:1px solid rgba(15,6,35,.08);margin-top:40px;background:transparent;",
        )}
      >
        <div
          style={css(
            "max-width:1140px;margin:0 auto;padding:34px 26px 44px;display:flex;flex-wrap:wrap;gap:24px 40px;align-items:flex-start;justify-content:space-between;",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:6px;max-width:420px;")}>
            <div style={css("display:flex;align-items:center;gap:8px;")}>
              <span style={css("font-size:17px;")}>🔥</span>
              <span style={css("font-weight:900;font-size:16px;letter-spacing:-.02em;")}>
                {OPERATOR.brand}
              </span>
            </div>
            <div style={css("font-size:12.5px;line-height:1.55;color:#9c9c9c;")}>
              {OPERATOR.brand} is operated by{" "}
              <span style={css("color:#5a5a5a;font-weight:600;")}>{OPERATOR.legalName}</span>
              , {OPERATOR_LOCATION}.
            </div>
            <a
              href={`mailto:${OPERATOR.email}`}
              style={css("font-size:12.5px;color:#4e3188;font-weight:600;")}
            >
              {OPERATOR.email}
            </a>
          </div>

          <nav
            style={css(
              "display:flex;flex-wrap:wrap;gap:8px 20px;font-size:13px;font-weight:600;color:#5a5a5a;",
            )}
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={(e) => onLinkClick(e, l)}
                style={css("color:#5a5a5a;cursor:pointer;")}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div
          style={css(
            "max-width:1140px;margin:0 auto;padding:0 26px 30px;font-family:ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.06em;color:#b5b5b5;",
          )}
        >
          © 2026 {OPERATOR.legalName}. All rights reserved.
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
