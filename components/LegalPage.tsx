import Link from "next/link";
import type { ReactNode } from "react";
import { css } from "./css";
import Footer from "./Footer";
import { OPERATOR, POLICY_UPDATED } from "@/lib/operator";

// Shared shell for the policy pages (Terms, Privacy, Refund, Shipping,
// Contact). Keeps the header, prose rhythm, and footer identical across all of
// them so the whole legal surface reads as one document set.

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={css("margin-top:30px;")}>
      <h2
        style={css(
          "font-size:19px;font-weight:800;letter-spacing:-.02em;margin:0 0 10px;color:#0f0623;",
        )}
      >
        {title}
      </h2>
      <div
        style={css(
          "font-size:15px;line-height:1.65;color:#4a4a4a;display:flex;flex-direction:column;gap:12px;",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({
  title,
  intro,
  children,
  embed = false,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  // `embed` renders the doc for the footer pop-up (inside an iframe): the site
  // header and footer are dropped and the background goes transparent so it
  // sits cleanly inside the modal card.
  embed?: boolean;
}) {
  return (
    <div
      style={css(
        embed
          ? "background:transparent;display:flex;flex-direction:column;"
          : "min-height:100vh;background:radial-gradient(120% 60% at 85% -10%,rgba(234,76,137,.06),transparent 55%),#f7f6f4;display:flex;flex-direction:column;",
      )}
    >
      {!embed && (
        <header
          style={css(
            "max-width:820px;width:100%;margin:0 auto;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;",
          )}
        >
          <Link href="/" style={css("display:flex;align-items:center;gap:9px;")}>
            <span style={css("font-size:20px;")}>🔥</span>
            <span style={css("font-weight:900;font-size:18px;letter-spacing:-.02em;")}>
              {OPERATOR.brand}
            </span>
          </Link>
          <Link
            href="/"
            style={css("font-size:13.5px;font-weight:700;color:#4e3188;")}
          >
            ← Back to roasting
          </Link>
        </header>
      )}

      <main
        style={css(
          embed
            ? "max-width:820px;width:100%;margin:0 auto;padding:16px 22px 34px;flex:1 0 auto;"
            : "max-width:820px;width:100%;margin:0 auto;padding:20px 26px 10px;flex:1 0 auto;",
        )}
      >
        <h1
          style={css(
            "font-size:clamp(30px,4vw,42px);line-height:1.06;font-weight:900;letter-spacing:-.03em;margin:0;",
          )}
        >
          {title}
        </h1>
        <div
          style={css(
            "margin-top:10px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;letter-spacing:.08em;color:#9c9c9c;",
          )}
        >
          LAST UPDATED · {POLICY_UPDATED.toUpperCase()}
        </div>
        {intro && (
          <p style={css("margin:20px 0 0;font-size:16px;line-height:1.6;color:#5a5a5a;")}>
            {intro}
          </p>
        )}
        {children}
      </main>

      {!embed && <Footer />}
    </div>
  );
}
