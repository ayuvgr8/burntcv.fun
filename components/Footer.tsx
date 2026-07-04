import Link from "next/link";
import { css } from "./css";
import { OPERATOR, OPERATOR_LOCATION } from "@/lib/operator";

const LINKS: { href: string; label: string }[] = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refunds" },
  { href: "/shipping", label: "Delivery" },
  { href: "/contact", label: "Contact" },
];

// Site-wide footer. Carries the operator identity + policy links Razorpay
// looks for during merchant activation. Presentational only (no hooks), so it
// renders fine inside the client Landing and the server-rendered policy pages.
export default function Footer() {
  return (
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
              style={css("color:#5a5a5a;")}
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
  );
}
