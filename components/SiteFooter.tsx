import Link from "next/link";
import { css } from "./css";
import { LEGAL } from "@/lib/legal";

// Rendered globally from app/layout.tsx so every route — landing, /linkedin,
// and all four policy pages — carries these links in the footer. Payment
// aggregators (Razorpay) require Terms, Privacy, Refund/Cancellation and
// Contact to be reachable from every page before they activate your account.

const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund & Cancellation" },
  { href: "/contact", label: "Contact" },
];

export default function SiteFooter() {
  return (
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
              style={css("font-size:13px;font-weight:600;color:#4e3188;")}
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
  );
}
