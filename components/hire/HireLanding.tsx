"use client";

import Link from "next/link";
import { css } from "../css";
import Footer from "../Footer";
import ProductMenu from "../ProductMenu";

// BurntCV Hire landing — the sibling product's front door (PRD-Hire §16).
// Deliberately NOT the roast's tone: clean, trustworthy, evidence-forward —
// an audit tool, not a comedy act. Shared domain and nav for the suite feel;
// its own promise, stated plainly.

const BLUE = "#1a56db";
const INK = "#101828";
const MUTED = "#475467";
const FAINT = "#98a2b3";
const BG = "#f7f8fa";

function Wordmark({ size = 19 }: { size?: number }) {
  return (
    <Link href="/hire" style={css("text-decoration:none;display:flex;align-items:center;gap:9px;")}>
      <span
        style={css(
          `width:${size + 13}px;height:${size + 13}px;border-radius:9px;background:linear-gradient(135deg,#1a56db,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:${size - 4}px;`,
        )}
      >
        🎯
      </span>
      <span>
        <span style={css(`font-weight:900;font-size:${size}px;letter-spacing:-.02em;color:${INK};`)}>
          BurntCV <span style={css(`color:${BLUE};`)}>Hire</span>
        </span>
        <span
          style={css(
            "display:block;font-family:ui-monospace,Menlo,monospace;font-size:8.5px;letter-spacing:.2em;color:#98a2b3;margin-top:-2px;",
          )}
        >
          // SHOWS ITS WORK
        </span>
      </span>
    </Link>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Paste the JD — you set the bar",
    body: "We decompose the job description into weighted requirements: must-haves, nice-to-haves, implicit signals. You review, re-weight, and confirm every one. The AI proposes; the recruiter defines what matters.",
  },
  {
    n: "02",
    title: "Add candidates",
    body: "Paste résumé text or drop a PDF, attest the consent basis, and the pipeline extracts a structured profile — every fact carrying the verbatim line it came from.",
  },
  {
    n: "03",
    title: "Read the evidence. You decide.",
    body: "Each requirement is scored 0–4 with quoted supporting and contradicting evidence, gaps surfaced, and interview questions targeted at exactly what's unproven. Advance, hold, or pass — logged, with your name on it.",
  },
];

const PILLARS = [
  {
    emoji: "🧾",
    title: "Every score cites its line",
    body: "No holistic vibe-scores. Per-requirement ratings, each backed by a verbatim quote from the résumé — supporting and contradicting.",
  },
  {
    emoji: "🧮",
    title: "The verdict is math, not mood",
    body: "The AI extracts evidence; deterministic code applies your weights. Same input, same score, every time — reproducible and defensible in an audit.",
  },
  {
    emoji: "🙋",
    title: "A human owns every decision",
    body: "No silent auto-reject. Ever. Knockout failures are flagged, never actioned — every advance, hold, and pass is recorded to a named person.",
  },
  {
    emoji: "🛡️",
    title: "DPDP-first by design",
    body: "Consent attestation per candidate, purpose-limited to this role's screening, retention windows with real deletion, and one-click export for access requests.",
  },
];

export default function HireLanding() {
  return (
    <div style={css(`min-height:100vh;background:${BG};overflow-x:hidden;`)}>
      {/* ---- header ---- */}
      <div
        style={css(
          "max-width:1140px;margin:0 auto;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:14px;",
        )}
      >
        <Wordmark />
        <div style={css("display:flex;align-items:center;gap:14px;")}>
          <ProductMenu />
          <Link
            href="/hire/app"
            style={css(
              `text-decoration:none;background:${BLUE};color:#fff;font-weight:800;font-size:14px;padding:11px 19px;border-radius:10px;box-shadow:0 8px 18px -8px rgba(26,86,219,.55);`,
            )}
          >
            Open workspace →
          </Link>
        </div>
      </div>

      {/* ---- hero ---- */}
      <div style={css("max-width:1140px;margin:0 auto;padding:34px 26px 30px;")}>
        <div
          style={css(
            `display:inline-flex;align-items:center;gap:8px;background:rgba(26,86,219,.08);color:${BLUE};font-weight:800;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;padding:8px 14px;border-radius:999px;`,
          )}
        >
          AI Recruiting
        </div>
        <h1
          style={css(
            `font-size:clamp(36px,5vw,58px);line-height:1.04;font-weight:900;letter-spacing:-.035em;margin:18px 0 0;color:${INK};max-width:820px;`,
          )}
        >
          Hiring becomes faster with AI that{" "}
          <span style={css(`color:${BLUE};`)}>shows its work</span>.
        </h1>
        <p
          style={css(
            `margin:18px 0 0;font-size:clamp(16px,1.5vw,19px);line-height:1.6;color:${MUTED};max-width:640px;`,
          )}
        >
          BurntCV Hire screens résumés, identifies top candidates, and matches
          applicants against the role&apos;s real bar — with per-requirement scores,
          quoted evidence, and interview questions aimed at the gaps. The AI
          analyzes. <strong style={css(`color:${INK};`)}>You decide.</strong>
        </p>
        <div style={css("display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 0;")}>
          <Link
            href="/hire/app"
            style={css(
              `text-decoration:none;background:${BLUE};color:#fff;font-weight:800;font-size:15.5px;padding:14px 24px;border-radius:11px;box-shadow:0 10px 22px -8px rgba(26,86,219,.55);`,
            )}
          >
            Screen your first candidate — free
          </Link>
          <Link
            href="/hire/privacy"
            style={css(
              `text-decoration:none;background:#fff;border:1px solid rgba(16,24,40,.12);color:${INK};font-weight:700;font-size:15.5px;padding:14px 24px;border-radius:11px;`,
            )}
          >
            Our data promise
          </Link>
        </div>
        <div
          style={css(
            `margin:14px 0 0;font-size:12.5px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`,
          )}
        >
          Free pilot: 1 role · up to 5 candidates · full fit reports. No card.
        </div>
      </div>

      {/* ---- sample report strip ---- */}
      <div style={css("max-width:1140px;margin:0 auto;padding:26px 26px 10px;")}>
        <div
          style={css(
            "background:#fff;border:1px solid rgba(16,24,40,.08);border-radius:18px;box-shadow:0 24px 60px -30px rgba(16,24,40,.25);padding:22px 24px;max-width:720px;",
          )}
        >
          <div
            style={css(
              `display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px solid rgba(16,24,40,.07);padding-bottom:14px;`,
            )}
          >
            <div style={css(`font-weight:800;font-size:15px;color:${INK};`)}>
              Kubernetes production experience{" "}
              <span
                style={css(
                  "font-size:10.5px;font-weight:800;letter-spacing:.04em;color:#b42318;background:rgba(180,35,24,.08);padding:3px 8px;border-radius:999px;margin-left:6px;",
                )}
              >
                MUST-HAVE · WEIGHT 9
              </span>
            </div>
            <div style={css(`font-weight:900;font-size:15px;color:${BLUE};`)}>2 / 4 · Partial</div>
          </div>
          <div style={css(`padding:14px 0 0;display:flex;flex-direction:column;gap:10px;`)}>
            <div style={css("display:flex;gap:10px;align-items:flex-start;")}>
              <span style={css("font-size:13px;")}>✅</span>
              <div style={css(`font-size:13.5px;line-height:1.55;color:${MUTED};`)}>
                <em>&ldquo;Deployed microservices on Docker Swarm serving 2M requests/day&rdquo;</em>{" "}
                — adjacent container-orchestration evidence, requirement not directly met.
              </div>
            </div>
            <div style={css("display:flex;gap:10px;align-items:flex-start;")}>
              <span style={css("font-size:13px;")}>⚠️</span>
              <div style={css(`font-size:13.5px;line-height:1.55;color:${MUTED};`)}>
                Lists &ldquo;Kubernetes&rdquo; in skills — <em>no production usage found anywhere in
                work history.</em>
              </div>
            </div>
            <div
              style={css(
                `background:rgba(26,86,219,.05);border:1px solid rgba(26,86,219,.14);border-radius:11px;padding:12px 14px;font-size:13.5px;line-height:1.55;color:${INK};`,
              )}
            >
              <strong>Ask:</strong> &ldquo;You list Kubernetes but I don&apos;t see production usage —
              walk me through the last cluster you operated and what broke.&rdquo;
            </div>
          </div>
        </div>
        <div
          style={css(
            `margin:10px 0 0;font-size:12px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`,
          )}
        >
          ↑ an actual dimension from a fit report — evidence, contradiction, and the question to ask.
        </div>
      </div>

      {/* ---- how it works ---- */}
      <div style={css("max-width:1140px;margin:0 auto;padding:56px 26px 8px;")}>
        <h2
          style={css(
            `font-size:clamp(24px,3vw,34px);font-weight:900;letter-spacing:-.03em;margin:0;color:${INK};`,
          )}
        >
          Decision support, not a black-box gatekeeper.
        </h2>
        <div style={css("display:flex;flex-wrap:wrap;gap:18px;margin:26px 0 0;")}>
          {STEPS.map((s) => (
            <div
              key={s.n}
              style={css(
                "flex:1 1 280px;min-width:260px;background:#fff;border:1px solid rgba(16,24,40,.08);border-radius:16px;padding:22px;",
              )}
            >
              <div
                style={css(
                  `font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:12px;color:${BLUE};letter-spacing:.1em;`,
                )}
              >
                {s.n}
              </div>
              <div style={css(`font-weight:800;font-size:16.5px;margin:10px 0 8px;color:${INK};`)}>
                {s.title}
              </div>
              <div style={css(`font-size:14px;line-height:1.6;color:${MUTED};`)}>{s.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- pillars ---- */}
      <div style={css("max-width:1140px;margin:0 auto;padding:48px 26px 8px;")}>
        <div style={css("display:flex;flex-wrap:wrap;gap:18px;")}>
          {PILLARS.map((p) => (
            <div
              key={p.title}
              style={css(
                "flex:1 1 240px;min-width:240px;background:#fff;border:1px solid rgba(16,24,40,.08);border-radius:16px;padding:22px;",
              )}
            >
              <div style={css("font-size:24px;")}>{p.emoji}</div>
              <div style={css(`font-weight:800;font-size:15.5px;margin:10px 0 7px;color:${INK};`)}>
                {p.title}
              </div>
              <div style={css(`font-size:13.5px;line-height:1.6;color:${MUTED};`)}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- the firewall note ---- */}
      <div style={css("max-width:1140px;margin:0 auto;padding:48px 26px 30px;")}>
        <div
          style={css(
            `background:${INK};border-radius:18px;padding:30px 28px;display:flex;flex-wrap:wrap;gap:20px 40px;align-items:center;justify-content:space-between;`,
          )}
        >
          <div style={css("max-width:640px;")}>
            <div style={css("font-weight:900;font-size:19px;color:#fff;letter-spacing:-.02em;")}>
              Two products. One hard wall between them.
            </div>
            <div style={css("font-size:14px;line-height:1.6;color:#94a3b8;margin:8px 0 0;")}>
              The roast never stores a résumé — that promise stands. Hire stores candidate
              data <em>for your role only</em>, in your tenant, deleted on your schedule.
              Nothing ever crosses between the two. Not a résumé, not a pipeline, not a table.
            </div>
          </div>
          <Link
            href="/hire/app"
            style={css(
              `text-decoration:none;background:#fff;color:${INK};font-weight:800;font-size:15px;padding:13px 22px;border-radius:11px;white-space:nowrap;`,
            )}
          >
            Start screening →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
