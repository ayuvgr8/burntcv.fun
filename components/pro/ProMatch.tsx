"use client";

// BurntCV Pro — the candidate-side match report (/pro).
//
// The SAME two-stage engine as BurntCV Hire, pointed the other way: the job
// seeker pastes a JD + their own résumé and sees exactly how an AI screener
// scores them against that role — then gets honest fixes. STATELESS end to
// end: the browser drives the four stage calls and carries the intermediates;
// the server computes and forgets. The roast's "we never store your résumé"
// promise applies here verbatim — the report lives only in this tab.
//
// Design language: roast-brand side (this sells to the 48K roasted job
// seekers), but report-serious — flame accents on a calm page, no comedy in
// the numbers.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { css } from "../css";
import Footer from "../Footer";
import ProductMenu from "../ProductMenu";
import type { DimensionScore, FitBand, Gap, Requirement, ResumeExtraction } from "@/lib/hire/types";
import type { CoachFix } from "@/lib/pro/prompts";
import {
  claimCreem,
  fetchRegion,
  purchase,
  startCreemCheckout,
  type CreemKind,
  type Plan,
  type ProEntitlement,
} from "@/lib/payments";

const INK = "#0f0623";
const MUTED = "#5a5a5a";
const FAINT = "#9c9c9c";
const BG = "#f7f6f4";
const LINE = "rgba(15,6,35,.09)";
const FLAME = "linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89)";

// Candidate framing of the engine's bands — same verdict, other side of the table.
const BAND_META: Record<
  FitBand,
  { label: string; sub: string; fg: string; bg: string }
> = {
  STRONG: {
    label: "You clear this screen",
    sub: "A screener set up like this would shortlist you. Tighten the weak spots below and it's not close.",
    fg: "#067647",
    bg: "rgba(6,118,71,.09)",
  },
  POSSIBLE: {
    label: "Borderline — fixable",
    sub: "You'd survive some screens and miss others. The fixes below are where the points are.",
    fg: "#b54708",
    bg: "rgba(181,71,8,.1)",
  },
  WEAK: {
    label: "This screen filters you out today",
    sub: "As written, an AI screener scores you out. Some of that is phrasing — see exactly where below.",
    fg: "#b42318",
    bg: "rgba(180,35,24,.08)",
  },
  INSUFFICIENT_EVIDENCE: {
    label: "Machines can't read your résumé",
    sub: "The parser couldn't extract enough to score you — which is itself the finding. Fix the formatting first; content doesn't matter if it never gets read.",
    fg: "#6941c6",
    bg: "rgba(105,65,198,.09)",
  },
};

const CATEGORY_META: Record<string, { label: string; fg: string; bg: string }> = {
  MUST_HAVE: { label: "Must-have", fg: "#b42318", bg: "rgba(180,35,24,.08)" },
  PREFERRED: { label: "Preferred", fg: "#175cd3", bg: "rgba(23,92,211,.09)" },
  IMPLICIT: { label: "Implicit", fg: "#6941c6", bg: "rgba(105,65,198,.09)" },
};

const PRIORITY_META: Record<string, { label: string; fg: string; bg: string }> = {
  critical: { label: "CRITICAL", fg: "#fff", bg: "#b42318" },
  high: { label: "HIGH", fg: "#b42318", bg: "rgba(180,35,24,.09)" },
  medium: { label: "MEDIUM", fg: "#b54708", bg: "rgba(181,71,8,.1)" },
};

const MOVE_META: Record<string, string> = {
  rephrase: "Rephrase — it's there, the screener missed it",
  "add-if-true": "Add — only if it's true",
  gap: "Real gap — wording won't fix this",
};

const STAGES = [
  "Reading the JD like a screener",
  "Parsing your résumé",
  "Scoring you, requirement by requirement",
  "Writing your fixes",
];

const PRO_TOKEN_KEY = "burntcv_pro_token";

// Display prices — the charged amount is always server-derived from the plan.
const PAY_OPTIONS: {
  plan: Plan;
  price: string;
  title: string;
  sub: string;
  best?: boolean;
}[] = [
  { plan: "pro_single", price: "₹49", title: "1 match report", sub: "One JD, one report. The impulse buy." },
  {
    plan: "pro_pack",
    price: "₹149",
    title: "5 match reports",
    sub: "₹29.8 per match. Enough for a serious application week.",
    best: true,
  },
  {
    plan: "pro_pass",
    price: "₹299",
    title: "7-day unlimited",
    sub: "The job-hunt sprint pass. Run every JD you're chasing.",
  },
];

// International (Creem, USD). The ₹49 single stays India-only — it sits below
// the $4.99 card-fee floor (docs/pro.md).
const INTL_OPTIONS: {
  kind: CreemKind;
  price: string;
  title: string;
  sub: string;
  best?: boolean;
}[] = [
  {
    kind: "pro_pack",
    price: "$4.99",
    title: "5 match reports",
    sub: "About a dollar a match. Enough for a serious application week.",
    best: true,
  },
  {
    kind: "pro_pass",
    price: "$7.99",
    title: "7-day unlimited",
    sub: "The job-hunt sprint pass. Run every JD you're chasing.",
  },
];

interface Verdict {
  overallScore: number;
  band: FitBand;
  knockoutFailures: string[];
  confidence: number;
  needsReview: boolean;
  gaps: Gap[];
}

interface Report {
  roleTitle: string;
  requirements: Requirement[];
  extraction: ResumeExtraction;
  dimensions: DimensionScore[];
  verdict: Verdict;
  engineVersion: string;
  fixes: CoachFix[];
  reportsLeftToday: number | null;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "request_failed");
  return data as T;
}

export default function ProMatch() {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [stage, setStage] = useState(-1); // -1 idle, 0..3 running, 4 done
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Paid entitlement (credits / 7-day pass). Token in localStorage; the
  // server-side counter is the source of truth — this is display + proof.
  const [pro, setPro] = useState<ProEntitlement | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [freshCode, setFreshCode] = useState<string | null>(null);

  useEffect(() => {
    // Returning from a Creem hosted checkout? Claim it server-side (the server
    // re-verifies the product; the URL params are only a hint) and adopt the
    // minted entitlement.
    const url = new URL(window.location.href);
    const checkoutId = url.searchParams.get("checkout_id");
    const fromCreem = url.searchParams.get("creem") === "success" && checkoutId;
    if (fromCreem) {
      for (const p of ["creem", "kind", "checkout_id", "order_id", "signature", "request_id"]) {
        url.searchParams.delete(p);
      }
      window.history.replaceState({}, "", url.toString());
      (async () => {
        try {
          const claim = await claimCreem(checkoutId);
          if (claim.ok && claim.pro) {
            localStorage.setItem(PRO_TOKEN_KEY, claim.pro.token);
            setPro(claim.pro);
            setFreshCode(claim.pro.code);
            return;
          }
          setErr(
            claim.ok
              ? "Payment confirmed — your reports are being granted. Refresh in a minute if they haven't appeared."
              : "We couldn't confirm that payment yet. If you were charged, it will appear shortly — or contact support with your Creem receipt.",
          );
        } catch {
          setErr("We couldn't confirm that payment yet — refresh in a minute.");
        }
      })();
    }

    const token = localStorage.getItem(PRO_TOKEN_KEY);
    if (!token) return;
    (async () => {
      try {
        const res = await fetch("/api/pro/entitlement", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const data = await res.json();
          setPro(data.pro ?? null);
        } else if (res.status === 401 || res.status === 404) {
          localStorage.removeItem(PRO_TOKEN_KEY);
        }
      } catch {
        /* badge is cosmetic; the run path re-checks server-side */
      }
    })();
  }, []);

  const adoptPro = (p: ProEntitlement | null) => {
    setPro(p);
    if (p?.token) localStorage.setItem(PRO_TOKEN_KEY, p.token);
  };

  const onPdf = async (file: File) => {
    setPdfBusy(true);
    setErr(null);
    try {
      const form = new FormData();
      form.set("file", file);
      // The roast's existing stateless PDF→text route — processed in memory,
      // discarded after (same promise, same code path).
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "parse_failed");
      setResume(data.text);
    } catch {
      setErr("Couldn't read that PDF — paste the text instead.");
    } finally {
      setPdfBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const run = async () => {
    if (stage >= 0 && stage < 4) return;
    setErr(null);
    setReport(null);
    const proToken = localStorage.getItem(PRO_TOKEN_KEY) ?? undefined;
    try {
      setStage(0);
      const dec = await post<{
        roleTitle: string;
        requirements: Requirement[];
        reportsLeftToday: number | null;
        pro: ProEntitlement | null;
      }>("/api/pro/decompose", { jdText: jd, proToken });
      if (dec.pro) adoptPro(dec.pro);

      setStage(1);
      const ext = await post<{ extraction: ResumeExtraction }>("/api/pro/extract", {
        resumeText: resume,
        proToken,
      });

      setStage(2);
      const rated = await post<{
        dimensions: DimensionScore[];
        verdict: Verdict;
        engineVersion: string;
      }>("/api/pro/rate", {
        requirements: dec.requirements,
        extraction: ext.extraction,
        resumeText: resume,
        proToken,
      });

      setStage(3);
      let fixes: CoachFix[] = [];
      try {
        const coached = await post<{ fixes: CoachFix[] }>("/api/pro/coach", {
          requirements: dec.requirements,
          dimensions: rated.dimensions,
          roleTitle: dec.roleTitle,
          unparsedSections: ext.extraction.unparsedSections,
          proToken,
        });
        fixes = coached.fixes;
      } catch {
        /* coaching is best-effort — the scored report still stands */
      }

      setReport({
        roleTitle: dec.roleTitle,
        requirements: dec.requirements,
        extraction: ext.extraction,
        dimensions: rated.dimensions,
        verdict: rated.verdict,
        engineVersion: rated.engineVersion,
        fixes,
        reportsLeftToday: dec.reportsLeftToday ?? null,
      });
      setStage(4);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "payment_required") {
        // Free allowance spent → the paywall IS the answer, not an error.
        setPaywall(true);
        setErr(null);
        setStage(-1);
        return;
      }
      setErr(
        code === "budget_exhausted"
          ? "We've hit today's platform budget — try again after midnight UTC, or a paid report runs immediately."
          : code === "rate_limited"
            ? "Too many requests — give it a minute."
            : "Something broke mid-report. Your inputs are still here — run it again.",
      );
      setStage(-1);
    }
  };

  const ready = jd.trim().length >= 80 && resume.trim().length >= 120;
  const running = stage >= 0 && stage < 4;

  return (
    <div style={css(`min-height:100vh;background:${BG};overflow-x:hidden;`)}>
      {/* header */}
      <div
        style={css(
          "max-width:1080px;margin:0 auto;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:14px;",
        )}
      >
        <Link href="/" style={css("text-decoration:none;display:flex;align-items:center;gap:9px;")}>
          <span style={css("font-size:21px;")}>🔥</span>
          <span>
            <span style={css(`font-weight:900;font-size:19px;letter-spacing:-.02em;color:${INK};`)}>
              BurntCV{" "}
              <span
                style={css(
                  `background:${FLAME};-webkit-background-clip:text;background-clip:text;color:transparent;`,
                )}
              >
                Pro
              </span>
            </span>
            <span
              style={css(
                `display:block;font-family:ui-monospace,Menlo,monospace;font-size:8.5px;letter-spacing:.2em;color:${FAINT};margin-top:-2px;`,
              )}
            >
              // BEAT THE SCREEN
            </span>
          </span>
        </Link>
        <div style={css("display:flex;align-items:center;gap:12px;")}>
          {pro && (pro.passUntil > Date.now() || pro.creditsLeft > 0) ? (
            <span
              style={css(
                "font-size:12px;font-weight:800;color:#067647;background:rgba(6,118,71,.09);padding:6px 12px;border-radius:999px;font-family:ui-monospace,Menlo,monospace;",
              )}
            >
              {pro.passUntil > Date.now()
                ? `PASS until ${new Date(pro.passUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                : `${pro.creditsLeft} match${pro.creditsLeft === 1 ? "" : "es"} left`}
            </span>
          ) : (
            <button
              onClick={() => setPaywall(true)}
              style={css(
                `border:none;cursor:pointer;background:transparent;font-family:inherit;font-size:13px;font-weight:800;color:#ed3237;padding:6px 4px;`,
              )}
            >
              Get reports →
            </button>
          )}
          <ProductMenu />
        </div>
      </div>

      <div style={css("max-width:1080px;margin:0 auto;padding:10px 26px 70px;")}>
        {/* hero */}
        {!report && (
          <div style={css("max-width:680px;margin:0 0 26px;")}>
            <h1
              style={css(
                `font-size:clamp(30px,4.4vw,46px);line-height:1.06;font-weight:900;letter-spacing:-.03em;margin:0;color:${INK};`,
              )}
            >
              Before they screen you,{" "}
              <span
                style={css(
                  `background:${FLAME};-webkit-background-clip:text;background-clip:text;color:transparent;`,
                )}
              >
                screen yourself
              </span>
              .
            </h1>
            <p style={css(`margin:14px 0 0;font-size:16px;line-height:1.6;color:${MUTED};`)}>
              Paste the job description and your résumé. The same evidence-scoring
              engine recruiters use reads you the way their AI does — requirement by
              requirement, quoting the exact lines that helped or hurt — then tells
              you what to fix. Honestly.{" "}
              <strong style={css(`color:${INK};`)}>
                Nothing is stored — the report lives only in this tab.
              </strong>
            </p>
          </div>
        )}

        {/* intake */}
        {!report && (
          <div
            style={css(
              `background:#fff;border:1px solid ${LINE};border-radius:18px;padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 24px 60px -34px rgba(15,6,35,.3);`,
            )}
          >
            <div style={css("display:flex;gap:18px;flex-wrap:wrap;")}>
              <div style={css("flex:1;min-width:280px;display:flex;flex-direction:column;gap:7px;")}>
                <div
                  style={css(
                    `font-family:ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.12em;color:${FAINT};text-transform:uppercase;`,
                  )}
                >
                  1 · The job description
                </div>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the JD you're applying to…"
                  rows={9}
                  style={css(
                    `width:100%;box-sizing:border-box;background:${BG};border:1px solid rgba(15,6,35,.12);border-radius:12px;padding:13px 15px;font-size:13.5px;font-family:inherit;color:${INK};outline:none;resize:vertical;line-height:1.55;`,
                  )}
                />
              </div>
              <div style={css("flex:1;min-width:280px;display:flex;flex-direction:column;gap:7px;")}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;gap:8px;")}>
                  <div
                    style={css(
                      `font-family:ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.12em;color:${FAINT};text-transform:uppercase;`,
                    )}
                  >
                    2 · Your résumé
                  </div>
                  <label
                    style={css(
                      `font-size:12px;font-weight:800;color:#4e3188;background:rgba(78,49,136,.08);padding:5px 11px;border-radius:999px;cursor:pointer;`,
                    )}
                  >
                    {pdfBusy ? "Reading PDF…" : "📎 Upload PDF"}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => e.target.files?.[0] && onPdf(e.target.files[0])}
                      style={css("display:none;")}
                    />
                  </label>
                </div>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="…and paste (or upload) your résumé text"
                  rows={9}
                  style={css(
                    `width:100%;box-sizing:border-box;background:${BG};border:1px solid rgba(15,6,35,.12);border-radius:12px;padding:13px 15px;font-size:13.5px;font-family:inherit;color:${INK};outline:none;resize:vertical;line-height:1.55;`,
                  )}
                />
              </div>
            </div>

            {err && (
              <div style={css("font-size:13.5px;color:#b42318;font-weight:700;")}>{err}</div>
            )}

            {running ? (
              <div style={css("display:flex;flex-direction:column;gap:9px;padding:6px 2px;")}>
                {STAGES.map((s, i) => (
                  <div key={s} style={css("display:flex;align-items:center;gap:10px;")}>
                    <span style={css("font-size:14px;width:20px;text-align:center;")}>
                      {i < stage ? "✅" : i === stage ? "🔥" : "·"}
                    </span>
                    <span
                      style={css(
                        `font-size:13.5px;font-weight:${i === stage ? 800 : 600};color:${
                          i <= stage ? INK : FAINT
                        };`,
                      )}
                    >
                      {s}
                      {i === stage ? "…" : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={css("display:flex;align-items:center;gap:14px;flex-wrap:wrap;")}>
                <button
                  onClick={run}
                  disabled={!ready}
                  style={css(
                    `border:none;cursor:${ready ? "pointer" : "default"};background:${FLAME};color:#fff;font-weight:800;font-size:15.5px;padding:14px 26px;border-radius:999px;box-shadow:0 10px 22px -8px rgba(237,50,55,.55);opacity:${ready ? 1 : 0.45};font-family:inherit;`,
                  )}
                >
                  Run my match report →
                </button>
                <span style={css(`font-size:12px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`)}>
                  ~60s · 4 engine passes · nothing stored
                </span>
              </div>
            )}
          </div>
        )}

        {/* fresh purchase → the restore code, shown once, loudly */}
        {freshCode && (
          <div
            style={css(
              "margin:18px 0 0;background:#0f0623;border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;",
            )}
          >
            <div style={css("flex:1;min-width:240px;")}>
              <div style={css("font-weight:900;font-size:15px;color:#fff;")}>
                Payment confirmed — save this code
              </div>
              <div style={css("font-size:12.5px;line-height:1.5;color:#a99fc2;margin:4px 0 0;")}>
                It&apos;s your receipt and your restore key on any device. We can&apos;t
                recover it for you later (we keep almost nothing, remember?).
              </div>
            </div>
            <div
              style={css(
                "font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:18px;color:#ffdd00;letter-spacing:.06em;",
              )}
            >
              {freshCode}
            </div>
            <button
              onClick={() => setFreshCode(null)}
              style={css(
                "border:none;background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font-weight:800;font-size:12px;padding:8px 12px;border-radius:9px;font-family:inherit;",
              )}
            >
              Saved it ✓
            </button>
          </div>
        )}

        {/* report */}
        {report && (
          <ReportView
            report={report}
            pro={pro}
            onBuy={() => setPaywall(true)}
            onReset={() => {
              setReport(null);
              setStage(-1);
            }}
          />
        )}
      </div>

      {paywall && (
        <Paywall
          onClose={() => setPaywall(false)}
          onPurchased={(p) => {
            adoptPro(p);
            setFreshCode(p.code);
            setPaywall(false);
          }}
        />
      )}
      <Footer />
    </div>
  );
}

// ---------- paywall ----------

function Paywall({
  onClose,
  onPurchased,
}: {
  onClose: () => void;
  onPurchased: (p: ProEntitlement) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreCode, setRestoreCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  // India → Razorpay/UPI in ₹; everyone else → Creem hosted checkout in USD
  // (fails open to INTL, same as the roast — foreigners never get UPI-only).
  const [region, setRegion] = useState<"IN" | "INTL" | null>(null);

  useEffect(() => {
    fetchRegion().then(setRegion);
  }, []);

  const buy = async (plan: Plan) => {
    if (busy) return;
    setBusy(plan);
    setNote(null);
    try {
      const res = await purchase(plan);
      if (res.ok && res.pro) {
        onPurchased(res.pro);
      } else if (res.ok && res.simulated) {
        setNote("Payments aren't configured in this environment — simulated checkout, nothing granted.");
      } else if (res.ok) {
        setNote("Payment received — your credits are being confirmed. Reopen this in a minute if they haven't appeared.");
      } else {
        setNote("Payment didn't complete. Nothing was charged beyond what Razorpay shows.");
      }
    } finally {
      setBusy(null);
    }
  };

  // International purchase: redirect to Creem's hosted checkout; on return,
  // /pro?creem=success&checkout_id=… is claimed server-side.
  const buyCreem = async (kind: CreemKind) => {
    if (busy) return;
    setBusy(kind);
    setNote(null);
    const started = await startCreemCheckout(kind);
    if (!started) {
      setNote("International checkout isn't available right now — try again shortly.");
      setBusy(null);
    }
    // On success the browser navigates away; no state to restore here.
  };

  const restore = async () => {
    if (!restoreCode.trim()) return;
    setNote(null);
    try {
      const res = await fetch("/api/pro/entitlement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: restoreCode }),
      });
      const data = await res.json();
      if (res.ok && data.pro) onPurchased(data.pro as ProEntitlement);
      else setNote("That code didn't match an active purchase.");
    } catch {
      setNote("Couldn't reach the server — try again.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Get match reports"
      onClick={onClose}
      style={css(
        "position:fixed;inset:0;z-index:120;background:rgba(15,6,35,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;",
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={css(
          "width:100%;max-width:560px;max-height:90vh;overflow:auto;background:#fff;border-radius:20px;padding:26px;box-shadow:0 40px 90px -28px rgba(15,6,35,.65);",
        )}
      >
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:12px;")}>
          <div>
            <div style={css(`font-weight:900;font-size:20px;letter-spacing:-.02em;color:${INK};`)}>
              Keep screening yourself
            </div>
            <div style={css(`font-size:13px;line-height:1.55;color:${MUTED};margin:5px 0 0;max-width:400px;`)}>
              Pay per report or grab the sprint pass — no subscription, nothing to
              cancel. You&apos;re job-hunting, not signing a lease.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={css(
              "border:none;background:rgba(15,6,35,.06);cursor:pointer;width:34px;height:34px;border-radius:9px;font-size:16px;color:#5a5a5a;flex-shrink:0;",
            )}
          >
            ✕
          </button>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:10px;margin:18px 0 0;")}>
          {region === null ? (
            <div style={css(`font-size:13px;color:${FAINT};padding:14px 4px;`)}>
              Loading payment options…
            </div>
          ) : (
            (region === "IN"
              ? PAY_OPTIONS.map((o) => ({ ...o, id: o.plan as string, intl: false }))
              : INTL_OPTIONS.map((o) => ({ ...o, id: o.kind as string, intl: true }))
            ).map((o) => (
              <button
                key={o.id}
                onClick={() => (o.intl ? buyCreem(o.id as CreemKind) : buy(o.id as Plan))}
                disabled={!!busy}
                style={css(
                  `text-align:left;cursor:pointer;font-family:inherit;background:${o.best ? "rgba(237,50,55,.04)" : "#fff"};border:1.5px solid ${o.best ? "#ed3237" : "rgba(15,6,35,.12)"};border-radius:14px;padding:15px 18px;display:flex;align-items:center;gap:14px;opacity:${busy && busy !== o.id ? 0.5 : 1};`,
                )}
              >
                <span style={css(`font-weight:900;font-size:19px;color:${INK};min-width:64px;`)}>
                  {o.price}
                </span>
                <span style={css("flex:1;")}>
                  <span style={css(`display:flex;align-items:center;gap:8px;font-weight:800;font-size:14.5px;color:${INK};`)}>
                    {o.title}
                    {o.best && (
                      <span
                        style={css(
                          "font-size:9.5px;font-weight:900;letter-spacing:.06em;color:#fff;background:#ed3237;padding:2px 8px;border-radius:999px;",
                        )}
                      >
                        BEST VALUE
                      </span>
                    )}
                  </span>
                  <span style={css(`display:block;font-size:12.5px;color:${MUTED};margin-top:2px;line-height:1.45;`)}>
                    {o.sub}
                  </span>
                </span>
                <span style={css(`font-weight:800;font-size:13px;color:#ed3237;white-space:nowrap;`)}>
                  {busy === o.id ? "Opening…" : "Buy →"}
                </span>
              </button>
            ))
          )}
        </div>

        {note && (
          <div style={css("font-size:13px;color:#b54708;font-weight:600;margin:12px 0 0;line-height:1.5;")}>
            {note}
          </div>
        )}

        <div
          style={css(
            `margin:18px 0 0;padding:14px 0 0;border-top:1px solid ${LINE};display:flex;align-items:center;gap:10px;flex-wrap:wrap;`,
          )}
        >
          <span style={css(`font-size:12.5px;font-weight:700;color:${MUTED};`)}>
            Already bought? Restore with your PRO- code:
          </span>
          <input
            value={restoreCode}
            onChange={(e) => setRestoreCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && restore()}
            placeholder="PRO-XXXX-XXXX"
            style={css(
              `flex:1;min-width:150px;background:${BG};border:1px solid rgba(15,6,35,.14);border-radius:9px;padding:9px 12px;font-size:13px;font-family:ui-monospace,Menlo,monospace;color:${INK};outline:none;`,
            )}
          />
          <button
            onClick={restore}
            style={css(
              `border:none;cursor:pointer;background:${INK};color:#fff;font-weight:800;font-size:12.5px;padding:10px 15px;border-radius:9px;font-family:inherit;`,
            )}
          >
            Restore
          </button>
        </div>
        <div style={css(`font-size:11px;color:${FAINT};margin:12px 0 0;line-height:1.5;`)}>
          {region === "INTL"
            ? "Global cards via Creem (Merchant of Record — tax handled). "
            : "UPI, cards and netbanking via Razorpay. "}
          We store your code, credits and paying email — never your résumé or
          reports. Reports stay in your tab only.
        </div>
      </div>
    </div>
  );
}

function ReportView({
  report,
  pro,
  onBuy,
  onReset,
}: {
  report: Report;
  pro: ProEntitlement | null;
  onBuy: () => void;
  onReset: () => void;
}) {
  const band = BAND_META[report.verdict.band];
  const reqById = new Map(report.requirements.map((r) => [r.id, r]));
  const knockoutLabels = report.verdict.knockoutFailures
    .map((id) => reqById.get(id)?.label ?? id)
    .filter(Boolean);

  return (
    <>
      {/* verdict */}
      <div
        style={css(
          `background:#fff;border:1px solid ${LINE};border-radius:18px;padding:26px;box-shadow:0 24px 60px -34px rgba(15,6,35,.3);`,
        )}
      >
        <div
          style={css(
            `font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.12em;color:${FAINT};text-transform:uppercase;margin:0 0 10px;`,
          )}
        >
          Match report · {report.roleTitle}
        </div>
        <div style={css("display:flex;align-items:center;gap:20px;flex-wrap:wrap;")}>
          <div
            style={css(
              `font-size:52px;font-weight:900;letter-spacing:-.04em;color:${INK};line-height:1;`,
            )}
          >
            {report.verdict.overallScore}
            <span style={css(`font-size:20px;color:${FAINT};font-weight:700;`)}>/100</span>
          </div>
          <div style={css("flex:1;min-width:260px;")}>
            <div
              style={css(
                `display:inline-block;background:${band.bg};color:${band.fg};font-weight:900;font-size:16px;padding:9px 16px;border-radius:11px;`,
              )}
            >
              {band.label}
            </div>
            <div style={css(`font-size:13.5px;line-height:1.55;color:${MUTED};margin:9px 0 0;`)}>
              {band.sub}
            </div>
          </div>
        </div>
        <div
          style={css(
            `margin:14px 0 0;font-size:11.5px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`,
          )}
        >
          confidence {Math.round(report.verdict.confidence * 100)}% · {report.engineVersion} ·
          deterministic verdict — same inputs, same score, every run
        </div>

        {knockoutLabels.length > 0 && (
          <div
            style={css(
              "margin:16px 0 0;background:rgba(180,35,24,.06);border:1px solid rgba(180,35,24,.22);border-radius:12px;padding:13px 16px;font-size:13.5px;line-height:1.55;color:#b42318;font-weight:600;",
            )}
          >
            🚫 Auto-filter risk: <strong>{knockoutLabels.join(" · ")}</strong> — many
            screeners hard-reject on these before a human ever looks. Fix these first.
          </div>
        )}
        {report.extraction.unparsedSections.length > 0 && (
          <div
            style={css(
              "margin:12px 0 0;background:rgba(105,65,198,.06);border:1px solid rgba(105,65,198,.2);border-radius:12px;padding:13px 16px;font-size:13.5px;line-height:1.55;color:#53389e;font-weight:600;",
            )}
          >
            ⚠ Parts of your résumé didn&apos;t parse cleanly (
            {report.extraction.unparsedSections.length} section
            {report.extraction.unparsedSections.length === 1 ? "" : "s"}) — whatever a
            machine can&apos;t read, it can&apos;t score.
          </div>
        )}
      </div>

      {/* fixes — the product */}
      {report.fixes.length > 0 && (
        <div style={css("margin:20px 0 0;")}>
          <h2 style={css(`font-size:21px;font-weight:900;letter-spacing:-.02em;margin:0 0 4px;color:${INK};`)}>
            What to fix — in order
          </h2>
          <p style={css(`font-size:13px;color:${MUTED};margin:0 0 14px;line-height:1.5;`)}>
            Three kinds of fixes: rephrasing what you already did, adding what&apos;s
            true but missing, and naming real gaps. We will never tell you to invent
            experience — that&apos;s not coaching, that&apos;s fraud with extra steps.
          </p>
          <div style={css("display:flex;flex-direction:column;gap:12px;")}>
            {report.fixes.map((f, i) => {
              const pr = PRIORITY_META[f.priority];
              const label =
                f.requirementId === "formatting"
                  ? "Résumé formatting"
                  : (reqById.get(f.requirementId)?.label ?? f.requirementId);
              return (
                <div
                  key={i}
                  style={css(
                    `background:#fff;border:1px solid ${LINE};border-radius:14px;padding:18px 20px;`,
                  )}
                >
                  <div style={css("display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
                    <span
                      style={css(
                        `font-size:10px;font-weight:900;letter-spacing:.06em;color:${pr.fg};background:${pr.bg};padding:3px 9px;border-radius:999px;`,
                      )}
                    >
                      {pr.label}
                    </span>
                    <span style={css(`font-weight:800;font-size:14.5px;color:${INK};`)}>{label}</span>
                    <span style={css(`font-size:11.5px;color:${FAINT};font-weight:600;`)}>
                      {MOVE_META[f.moveType]}
                    </span>
                  </div>
                  <div style={css(`font-size:13.5px;line-height:1.55;color:${INK};font-weight:600;margin:9px 0 0;`)}>
                    {f.problem}
                  </div>
                  <div style={css(`font-size:13.5px;line-height:1.6;color:${MUTED};margin:6px 0 0;`)}>
                    {f.fix}
                  </div>
                  {f.exampleLine && (
                    <div
                      style={css(
                        `margin:10px 0 0;background:${BG};border:1px dashed rgba(15,6,35,.18);border-radius:10px;padding:10px 13px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.55;color:${INK};`,
                      )}
                    >
                      {f.exampleLine}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* per-requirement breakdown */}
      <div style={css("margin:22px 0 0;")}>
        <h2 style={css(`font-size:21px;font-weight:900;letter-spacing:-.02em;margin:0 0 4px;color:${INK};`)}>
          How the screener scored you
        </h2>
        <p style={css(`font-size:13px;color:${MUTED};margin:0 0 14px;line-height:1.5;`)}>
          Every score cites the exact lines from your résumé that earned it — green
          helped, red hurt. N/A means the parser couldn&apos;t find enough to judge.
        </p>
        <div style={css("display:flex;flex-direction:column;gap:10px;")}>
          {report.dimensions
            .slice()
            .sort(
              (a, b) =>
                (reqById.get(a.requirementId)?.orderIndex ?? 0) -
                (reqById.get(b.requirementId)?.orderIndex ?? 0),
            )
            .map((x) => {
              const req = reqById.get(x.requirementId);
              if (!req) return null;
              const cat = CATEGORY_META[req.category];
              const color =
                x.score === null ? FAINT : x.score >= 3 ? "#067647" : x.score === 2 ? "#b54708" : "#b42318";
              return (
                <div
                  key={x.requirementId}
                  style={css(`background:#fff;border:1px solid ${LINE};border-radius:14px;padding:16px 18px;`)}
                >
                  <div style={css("display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;")}>
                    <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;")}>
                      <span style={css(`font-weight:800;font-size:14px;color:${INK};`)}>{req.label}</span>
                      <span
                        style={css(
                          `font-size:10.5px;font-weight:800;color:${cat.fg};background:${cat.bg};padding:2px 8px;border-radius:999px;`,
                        )}
                      >
                        {cat.label} · w{req.weight}
                      </span>
                      {req.isKnockout && (
                        <span
                          style={css(
                            "font-size:10.5px;font-weight:800;color:#b42318;background:rgba(180,35,24,.08);padding:2px 8px;border-radius:999px;",
                          )}
                        >
                          Auto-filter
                        </span>
                      )}
                    </div>
                    <div style={css("display:flex;align-items:center;gap:8px;")}>
                      <div style={css("display:flex;gap:3px;")}>
                        {[1, 2, 3, 4].map((n) => (
                          <span
                            key={n}
                            style={css(
                              `width:16px;height:7px;border-radius:4px;background:${
                                x.score !== null && x.score >= n ? color : "rgba(15,6,35,.08)"
                              };`,
                            )}
                          />
                        ))}
                      </div>
                      <span
                        style={css(
                          `font-weight:900;font-size:14px;color:${color};font-family:ui-monospace,Menlo,monospace;`,
                        )}
                      >
                        {x.score === null ? "N/A" : `${x.score}/4`}
                      </span>
                    </div>
                  </div>
                  <div style={css(`font-size:13px;line-height:1.55;color:${MUTED};margin:7px 0 0;`)}>
                    {x.reasoning}
                  </div>
                  {x.supportingEvidence.map((ev, i) => (
                    <div
                      key={`s${i}`}
                      style={css(
                        `margin:7px 0 0;border-left:3px solid rgba(6,118,71,.5);background:rgba(6,118,71,.04);border-radius:0 9px 9px 0;padding:7px 12px;font-size:12.5px;line-height:1.5;color:${INK};font-style:italic;`,
                      )}
                    >
                      &ldquo;{ev}&rdquo;
                    </div>
                  ))}
                  {x.contradictingEvidence.map((ev, i) => (
                    <div
                      key={`c${i}`}
                      style={css(
                        `margin:7px 0 0;border-left:3px solid rgba(180,35,24,.5);background:rgba(180,35,24,.04);border-radius:0 9px 9px 0;padding:7px 12px;font-size:12.5px;line-height:1.5;color:${INK};`,
                      )}
                    >
                      ⚠ {ev}
                    </div>
                  ))}
                </div>
              );
            })}
        </div>
      </div>

      {/* footer bar */}
      <div style={css("margin:26px 0 0;display:flex;align-items:center;gap:14px;flex-wrap:wrap;")}>
        <button
          onClick={onReset}
          style={css(
            `border:none;cursor:pointer;background:${FLAME};color:#fff;font-weight:800;font-size:14.5px;padding:13px 24px;border-radius:999px;font-family:inherit;box-shadow:0 8px 18px -8px rgba(237,50,55,.55);`,
          )}
        >
          Fix it, run it again →
        </button>
        {pro && pro.passUntil > Date.now() ? (
          <span style={css(`font-size:12px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`)}>
            unlimited on your pass until{" "}
            {new Date(pro.passUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        ) : pro && pro.creditsLeft > 0 ? (
          <span style={css(`font-size:12px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`)}>
            {pro.creditsLeft} paid match{pro.creditsLeft === 1 ? "" : "es"} left
          </span>
        ) : report.reportsLeftToday !== null ? (
          <span style={css(`font-size:12px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`)}>
            {report.reportsLeftToday} free report{report.reportsLeftToday === 1 ? "" : "s"} left today ·{" "}
            <button
              onClick={onBuy}
              style={css("border:none;background:none;cursor:pointer;color:#ed3237;font-weight:800;font-size:12px;padding:0;font-family:inherit;")}
            >
              get more
            </button>
          </span>
        ) : null}
        <span style={css(`font-size:12px;color:${FAINT};`)}>
          This report exists only in this tab — reload and it&apos;s gone. That&apos;s the point.
        </span>
      </div>
    </>
  );
}
