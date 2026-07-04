import Link from "next/link";
import type { ReactNode } from "react";
import { css } from "./css";

// ── Styled prose primitives (reused across all four policy pages) ──────────

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p
      style={css(
        "font-size:16px;line-height:1.7;color:#4a4753;margin:0 0 22px;font-weight:500;",
      )}
    >
      {children}
    </p>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      style={css(
        "font-size:19px;font-weight:700;color:#4e3188;letter-spacing:-.01em;margin:32px 0 10px;scroll-margin-top:24px;",
      )}
    >
      <span style={css("color:#f98731;font-weight:900;margin-right:8px;")}>//</span>
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p style={css("font-size:15px;line-height:1.75;color:#33303a;margin:0 0 14px;")}>
      {children}
    </p>
  );
}

export function Ul({ children }: { children: ReactNode }) {
  return <ul style={css("margin:0 0 16px;padding:0;list-style:none;")}>{children}</ul>;
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li
      style={css(
        "position:relative;font-size:15px;line-height:1.7;color:#33303a;padding:0 0 9px 22px;",
      )}
    >
      <span
        aria-hidden
        style={css(
          "position:absolute;left:2px;top:9px;width:6px;height:6px;border-radius:2px;background:linear-gradient(135deg,#f98731,#ed3237);",
        )}
      />
      {children}
    </li>
  );
}

export function A({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  const style = css(
    "color:#ed3237;font-weight:600;text-decoration:underline;text-underline-offset:2px;",
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}

export function Callout({
  children,
  tone = "fire",
}: {
  children: ReactNode;
  tone?: "fire" | "purple";
}) {
  const bg = tone === "purple" ? "rgba(78,49,136,.06)" : "rgba(237,50,55,.055)";
  const bd = tone === "purple" ? "rgba(78,49,136,.22)" : "rgba(237,50,55,.22)";
  return (
    <div
      style={css(
        `background:${bg};border:1.5px solid ${bd};border-radius:14px;padding:15px 17px;margin:0 0 22px;font-size:14.5px;line-height:1.7;color:#33303a;`,
      )}
    >
      {children}
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────

export default function LegalPage({
  title,
  tagline,
  updated,
  children,
  embed = false,
}: {
  title: string;
  tagline?: string;
  updated: string;
  children: ReactNode;
  // `embed` renders the doc for the footer pop-up (inside an iframe): the site
  // nav bar is dropped and the page background goes transparent so it sits
  // cleanly inside the modal card.
  embed?: boolean;
}) {
  return (
    <main
      style={css(
        embed
          ? "background:transparent;color:#0f0623;"
          : "min-height:100vh;background:#e9e7ec;color:#0f0623;",
      )}
    >
      <div
        style={css(
          embed
            ? "max-width:780px;margin:0 auto;padding:20px 18px 40px;"
            : "max-width:780px;margin:0 auto;padding:26px 20px 60px;",
        )}
      >
        {/* top bar — hidden in embed/pop-up mode */}
        {!embed && (
          <div
            style={css(
              "display:flex;align-items:center;justify-content:space-between;margin-bottom:30px;",
            )}
          >
            <Link
              href="/"
              style={css(
                "display:inline-flex;align-items:center;gap:8px;font-weight:900;font-size:18px;color:#0f0623;",
              )}
            >
              <span aria-hidden style={css("font-size:20px;")}>
                🔥
              </span>{" "}
              BurntCV
            </Link>
            <Link
              href="/"
              style={css("font-size:13px;font-weight:600;color:#4e3188;")}
            >
              ← back to roasting
            </Link>
          </div>
        )}

        {/* header */}
        <header style={css("margin-bottom:24px;")}>
          <span
            style={css(
              "display:inline-block;background:linear-gradient(135deg,#f98731,#ed3237);color:#fff;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding:5px 12px;border-radius:999px;margin-bottom:16px;",
            )}
          >
            Last updated · {updated}
          </span>
          <h1
            style={css(
              "font-size:clamp(30px,6vw,44px);font-weight:900;line-height:1.05;letter-spacing:-.02em;margin:0 0 10px;color:#0f0623;",
            )}
          >
            {title}
          </h1>
          {tagline ? (
            <p style={css("font-size:16px;color:#6a6676;margin:0;line-height:1.5;")}>
              {tagline}
            </p>
          ) : null}
        </header>

        {/* paper */}
        <article
          style={css(
            "background:#faf9f7;border:1.5px solid rgba(15,6,35,.08);border-radius:22px;padding:clamp(22px,4vw,40px);box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 20px 44px -30px rgba(15,6,35,.4);",
          )}
        >
          {children}
        </article>
      </div>
    </main>
  );
}
