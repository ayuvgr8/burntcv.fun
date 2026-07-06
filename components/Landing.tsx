"use client";

import { useEffect, useState } from "react";
import { css } from "./css";
import Footer from "./Footer";
import { PERSONAS, INTENSITIES } from "@/lib/roast";

// ---------------------------------------------------------------------------
// Content. All copy is curated & static — no résumés are stored, and the
// landing page must render instantly, so the "sample roasts" live here rather
// than hitting the model. Keep every line true-BECAUSE-funny, on brand.
// ---------------------------------------------------------------------------

// The hero card swaps with the Mild / Medium / Unhinged 💀 slider so the
// intensity choice is felt in three seconds, before anyone uploads a thing.
const SAMPLES: Record<
  string,
  { line: string; truth: string }
> = {
  mild: {
    line: "“A perfectly nice résumé that’s playing it about two beers too safe.”",
    truth:
      "Nothing here is wrong. Nothing here is memorable either. A recruiter forgets it before the next tab loads.",
  },
  medium: {
    line: "“A document that confidently says nothing, in Calibri.”",
    truth:
      "The two-year gap is the most honest line on the page. The ATS bot, tragically, has no soul.",
  },
  unhinged: {
    line: "“Six years of experience and not one sentence survives a follow-up question. This isn’t a résumé, it’s an alibi.”",
    truth:
      "You didn’t write a career. You wrote a hostage note where the hostage is the truth about what you actually did.",
  },
};

// r/RoastMe energy: the funniest anonymized lines, each carrying the URL.
const WALL = [
  "“Results-driven professional” — driven by results the way a parked car is driven.",
  "Listed “Microsoft Word” as a skill. In 2026. Bold. Historic, even.",
  "“Passionate about synergy.” Sir, this is a résumé, not a hostage note.",
  "9 years of experience, 0 numbers. A career told entirely in vibes.",
  "“Team player” appears four times. We get it — you can’t work alone.",
  "Objective: “seeking a challenging role.” Congratulations, reading this was one.",
  "“Spearheaded initiatives” is the résumé equivalent of “I was in the room.”",
  "Two pages. One and a half of them are “References available upon request.”",
  "“Familiar with Python” is carrying an entire career on a single adverb.",
  "“Wore many hats” — none of them, apparently, a job title.",
];

// One savage sample line per persona, so replay value is obvious up front.
const PERSONA_LINES: Record<string, string> = {
  recruiter:
    "I’ve read this exact bullet 4,000 times. It didn’t get a job the other 3,999 either.",
  gordon:
    "THIS BULLET IS RAW. You “managed stakeholders”? YOU CC’d PEOPLE. GET OUT.",
  vc: "No metrics, no moat, no traction. I’ve seen pre-seed decks with more substance than your summary.",
  parent:
    "Sharma-ji’s son put numbers on his résumé. But no — you have “a passion for excellence.”",
  influencer:
    "Agree? 👇\n\nMost people won’t admit this.\n\nYour résumé is a broetry thread held together by a staple.",
  philosopher:
    "You “optimised the funnel.” The funnel remains. So, in the end — do you?",
};

// Before/After where the "before" annotations are actual roasts.
const BEFORE_AFTER = [
  {
    before: "Responsible for handling various tasks and supporting the team as needed.",
    roast: "“Various tasks” is résumé for “I genuinely don’t remember what I did.”",
    after: "Cut onboarding time 40% by rebuilding the team’s ticket-triage flow.",
  },
  {
    before: "Passionate self-starter with excellent communication skills.",
    roast: "Four adjectives, zero evidence. This is a horoscope, not a bullet.",
    after: "Ran weekly demos for 30+ stakeholders; shipped 12 features in two quarters.",
  },
];

const FAQ = [
  {
    q: "Will it actually roast me, or just say “nice job”?",
    a: "It bites. Pick Unhinged 💀 and find out — the whole point is that it’s funny because it’s true.",
  },
  {
    q: "Do you store my résumé?",
    a: "No. Roasted and forgotten — your text is processed to write the roast, then dropped. We never save it.",
  },
  {
    q: "Is it free?",
    a: "Your first roast is free. Deeper roasts and the Glow-Up rewrite cost less than a samosa.",
  },
  {
    q: "Can it actually help my résumé?",
    a: "Yes. The Glow-Up mode rewrites your weakest bullets with real numbers and a narrative that survives a follow-up question.",
  },
  {
    q: "Can I share the roast?",
    a: "That’s the idea. Every roast comes as a screenshot-ready card with your Roast Score and grade.",
  },
];

// Persona-section tagline rotates on every reload — two takes on the same idea.
const PERSONA_TAGLINES = [
  "Same résumé. Different nightmare. The evidence doesn’t change — who’s in the room does. Collect all of them.",
  "Same résumé, six voices. Run it again and again — each one finds a new way to hurt.",
];

// Where the animated counter starts on first paint — a touch below the API's
// BASE (app/api/stats) so the number always rolls upward into the real value.
const COUNTER_START = 48070;

const INT_ACCENT: Record<string, string> = {
  mild: "#f0a24b",
  medium: "#ed3237",
  unhinged: "#0f0623",
};

export default function Landing({
  onRoast,
  onLinkedIn,
}: {
  onRoast: () => void;
  onLinkedIn: () => void;
}) {
  const [level, setLevel] = useState("medium");
  // Start deterministic (index 0) to match SSR, then randomise after mount so
  // the persona tagline changes on every reload without a hydration mismatch.
  const [taglineIdx, setTaglineIdx] = useState(0);
  useEffect(() => {
    setTaglineIdx(Math.floor(Math.random() * PERSONA_TAGLINES.length));
  }, []);

  // Live "résumés roasted" counter. `shown` is the animated value on screen;
  // `target` is the true count from /api/stats. We start `shown` just below the
  // base so the number always rolls up on first paint, then animate toward each
  // fresh target (polled every 20s, so it ticks as other people get roasted).
  const [shown, setShown] = useState(COUNTER_START);
  const [target, setTarget] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/stats", { cache: "no-store" });
        const d = await r.json();
        if (alive && typeof d.count === "number") setTarget(d.count);
      } catch {
        /* keep the last shown value; the counter is cosmetic */
      }
    };
    pull();
    const id = setInterval(pull, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  useEffect(() => {
    if (target == null) return;
    const from = shown;
    const dur = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setShown(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Intentionally only re-run when a new target arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const sample = SAMPLES[level];
  const accent = INT_ACCENT[level];
  const levelMeta = INTENSITIES.find((i) => i.id === level)!;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      style={css(
        "min-height:100vh;background:radial-gradient(120% 80% at 80% -10%,rgba(234,76,137,.07),transparent 50%),#f7f6f4;overflow-x:hidden;",
      )}
    >
      {/* ============ HEADER ============ */}
      <div
        style={css(
          "max-width:1140px;margin:0 auto;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;",
        )}
      >
        <div style={css("display:flex;align-items:center;gap:9px;")}>
          <span style={css("font-size:21px;")}>🔥</span>
          <div>
            <div style={css("font-weight:900;font-size:19px;letter-spacing:-.02em;")}>
              BurntCV
            </div>
            <div
              style={css(
                "font-family:ui-monospace,Menlo,monospace;font-size:8.5px;letter-spacing:.2em;color:#9c9c9c;margin-top:-2px;",
              )}
            >
              // SCREWED IT
            </div>
          </div>
        </div>
        <div style={css("display:flex;align-items:center;gap:18px;")}>
          <button
            onClick={onRoast}
            style={css(
              "border:none;cursor:pointer;background:#0f0623;color:#fff;font-weight:700;font-size:14px;padding:11px 18px;border-radius:11px;",
            )}
          >
            Roast my résumé
          </button>
        </div>
      </div>

      {/* ============ HERO ============ */}
      <div
        style={css(
          "max-width:1140px;margin:0 auto;padding:24px 26px 70px;display:flex;flex-wrap:wrap;gap:48px;align-items:center;",
        )}
      >
        <div
          style={css(
            "flex:1 1 380px;min-width:300px;display:flex;flex-direction:column;gap:20px;",
          )}
        >
          <div
            style={css(
              "display:inline-flex;align-self:flex-start;align-items:center;gap:8px;background:rgba(78,49,136,.08);color:#4e3188;font-weight:700;font-size:13px;padding:8px 14px;border-radius:999px;",
            )}
          >
            🔥 {shown.toLocaleString()} résumés roasted
          </div>
          <h1
            style={css(
              "font-size:clamp(38px,5.4vw,62px);line-height:1.02;font-weight:900;letter-spacing:-.035em;margin:0;",
            )}
          >
            We read it so a{" "}
            <span
              style={css(
                "background:linear-gradient(115deg,#ffdd00,#f98731 34%,#ed3237 70%,#ea4c89);-webkit-background-clip:text;background-clip:text;color:transparent;",
              )}
            >
              recruiter
            </span>{" "}
            doesn&apos;t have to suffer.
          </h1>
          <p
            style={css(
              "margin:0;font-size:clamp(16px,1.5vw,19px);line-height:1.55;color:#5a5a5a;max-width:520px;",
            )}
          >
            Drop your résumé. Get a brutally honest, very funny roast — your real
            career trajectory and one dark truth included.{" "}
            <span style={css("white-space:nowrap;")}>Under 30 seconds. 🌑</span>
          </p>

          {/* Intensity teaser slider — tells people this one actually bites */}
          <div style={css("display:flex;flex-direction:column;gap:8px;")}>
            <div
              style={css(
                "font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.14em;color:#9c9c9c;",
              )}
            >
              PICK YOUR BURN
            </div>
            <div
              style={css(
                "display:inline-flex;background:#fff;border:1.5px solid rgba(15,6,35,.1);border-radius:14px;padding:5px;gap:4px;align-self:flex-start;box-shadow:0 8px 22px -14px rgba(15,6,35,.4);",
              )}
            >
              {INTENSITIES.map((it) => {
                const on = it.id === level;
                return (
                  <button
                    key={it.id}
                    onClick={() => setLevel(it.id)}
                    style={css(
                      "border:none;cursor:pointer;padding:9px 15px;border-radius:10px;font-weight:800;font-size:14px;display:flex;align-items:center;gap:6px;transition:all .16s;" +
                        (on
                          ? `background:${INT_ACCENT[it.id]};color:${it.id === "mild" ? "#0f0623" : "#fff"};`
                          : "background:transparent;color:#808080;"),
                    )}
                  >
                    <span>{it.emoji}</span>
                    {it.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={css("display:flex;flex-wrap:wrap;gap:12px;align-items:center;")}>
            <button
              onClick={onRoast}
              style={css(
                "border:none;cursor:pointer;padding:17px 26px;border-radius:15px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:17px;display:flex;align-items:center;gap:10px;box-shadow:0 18px 30px -12px rgba(237,50,55,.6);",
              )}
            >
              Roast my résumé →
            </button>
            <button
              onClick={() => scrollTo("wall")}
              style={css(
                "border:1.5px solid rgba(15,6,35,.16);background:#fff;cursor:pointer;padding:17px 22px;border-radius:15px;color:#0f0623;font-weight:700;font-size:16px;",
              )}
            >
              See a sample ↓
            </button>
          </div>
          <div
            style={css(
              "font-size:12.5px;color:#9c9c9c;display:flex;gap:7px;align-items:center;flex-wrap:wrap;",
            )}
          >
            🔒 Roasted and forgotten — we never store your résumé.{" "}
            <a
              onClick={onLinkedIn}
              style={css("color:#4e3188;font-weight:700;cursor:pointer;")}
            >
              or roast a LinkedIn profile →
            </a>
          </div>
        </div>

        {/* Hero card — reacts to the slider, proving the promise above the fold */}
        <div
          style={css(
            "flex:1 1 340px;min-width:300px;position:relative;display:flex;justify-content:center;align-items:center;min-height:460px;",
          )}
        >
          <div
            key={level}
            style={css(
              "width:312px;background:#0f0623;border-radius:26px;padding:26px;color:#fff;position:relative;overflow:hidden;box-shadow:0 40px 70px -28px rgba(15,6,35,.6);animation:fadeup .3s ease;",
            )}
          >
            <div
              style={css(
                `position:absolute;bottom:-60px;left:-30px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,${accent}88,rgba(237,50,55,.1) 55%,transparent 72%);filter:blur(8px);animation:ember 4s ease-in-out infinite;`,
              )}
            ></div>
            <div style={css("position:relative;")}>
              <div
                style={css(
                  "display:flex;align-items:center;justify-content:space-between;",
                )}
              >
                <div
                  style={css(
                    "display:flex;align-items:center;gap:6px;font-weight:900;font-size:14px;",
                  )}
                >
                  🔥 BurntCV
                </div>
                <span
                  style={css(
                    `font-size:9px;letter-spacing:.12em;color:#f98731;font-weight:700;border:1px solid rgba(249,135,49,.5);border-radius:999px;padding:3px 8px;`,
                  )}
                >
                  {levelMeta.label.toUpperCase()} ROAST {levelMeta.emoji}
                </span>
              </div>
              <p
                style={css(
                  "margin:22px 0 0;font-size:21px;line-height:1.28;font-weight:700;letter-spacing:-.01em;",
                )}
              >
                {sample.line}
              </p>
              <div
                style={css("height:1px;background:rgba(255,255,255,.14);margin:22px 0;")}
              ></div>
              <div
                style={css(
                  "font-size:10px;letter-spacing:.14em;font-weight:700;color:#f98731;",
                )}
              >
                🌑 DARK TRUTH
              </div>
              <p
                style={css(
                  "margin:8px 0 0;font-size:13.5px;line-height:1.45;color:rgba(255,255,255,.92);",
                )}
              >
                {sample.truth}
              </p>
              <div
                style={css(
                  "display:flex;align-items:center;justify-content:space-between;margin-top:22px;font-size:11px;color:rgba(255,255,255,.55);",
                )}
              >
                <span>burntcv</span>
                <span style={css("color:#fff;font-weight:700;")}>roast yours →</span>
              </div>
            </div>
          </div>
          <div
            style={css(
              "position:absolute;top:6px;left:-6px;transform:rotate(-8deg);width:188px;background:#fff;border:1px solid rgba(15,6,35,.1);border-left:4px solid #f98731;border-radius:12px;padding:11px 13px;box-shadow:0 16px 28px -14px rgba(15,6,35,.34);font-size:12px;line-height:1.4;font-weight:500;",
            )}
          >
            &quot;&apos;Familiar with Python&apos; is carrying a career on one
            adverb.&quot;
          </div>
          <div
            style={css(
              "position:absolute;bottom:18px;right:-10px;transform:rotate(7deg);width:172px;background:#fff;border:1px solid rgba(15,6,35,.1);border-radius:12px;padding:11px 13px;box-shadow:0 16px 28px -14px rgba(15,6,35,.34);font-size:12px;line-height:1.4;font-weight:500;",
            )}
          >
            <span
              style={css(
                "color:#ed3237;font-weight:800;font-size:9px;letter-spacing:.1em;",
              )}
            >
              VERDICT
            </span>
            <br />
            Competent, hiding behind a committee&apos;s vocabulary.
          </div>
        </div>
      </div>

      {/* ============ WALL OF FLAME ============ */}
      <section id="wall" style={css("padding:60px 0 66px;background:#0f0623;color:#fff;")}>
        <div style={css("max-width:1140px;margin:0 auto;padding:0 26px 30px;")}>
          <div
            style={css(
              "display:inline-flex;align-items:center;gap:8px;background:rgba(249,135,49,.16);color:#f98731;font-weight:700;font-size:13px;padding:7px 13px;border-radius:999px;",
            )}
          >
            🔥 THE WALL OF FLAME
          </div>
          <h2
            style={css(
              "font-size:clamp(28px,3.6vw,40px);font-weight:900;letter-spacing:-.03em;margin:16px 0 8px;",
            )}
          >
            Real roasts. Zero survivors.
          </h2>
          <p style={css("margin:0;color:rgba(255,255,255,.6);font-size:16px;max-width:520px;")}>
            A live feed of the funniest anonymized roasts. Yours could be next.
          </p>
        </div>

        {/* Two marquee rows drifting in opposite directions */}
        <MarqueeRow items={WALL} reverse={false} />
        <div style={css("height:16px;")}></div>
        <MarqueeRow items={[...WALL].reverse()} reverse={true} />
      </section>

      {/* ============ BEFORE / AFTER ============ */}
      <section style={css("max-width:1140px;margin:0 auto;padding:76px 26px;")}>
        <div style={css("text-align:center;margin-bottom:40px;")}>
          <div
            style={css(
              "display:inline-flex;align-items:center;gap:8px;background:rgba(78,49,136,.08);color:#4e3188;font-weight:700;font-size:13px;padding:7px 13px;border-radius:999px;",
            )}
          >
            🩹 THE GLOW-UP
          </div>
          <h2
            style={css(
              "font-size:clamp(28px,3.6vw,40px);font-weight:900;letter-spacing:-.03em;margin:16px 0 8px;",
            )}
          >
            We roast it. Then we fix it.
          </h2>
          <p style={css("margin:0 auto;color:#5a5a5a;font-size:16px;max-width:520px;")}>
            Every weak bullet gets called out — then rewritten with a number that
            survives a follow-up question.
          </p>
        </div>

        <div style={css("display:flex;flex-wrap:wrap;gap:22px;")}>
          {BEFORE_AFTER.map((b, i) => (
            <div
              key={i}
              style={css(
                "flex:1 1 380px;min-width:290px;background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:20px;padding:22px;box-shadow:0 24px 50px -30px rgba(15,6,35,.3);",
              )}
            >
              <div
                style={css(
                  "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.14em;color:#ed3237;font-weight:700;",
                )}
              >
                BEFORE
              </div>
              <p
                style={css(
                  "margin:8px 0 0;font-size:15px;line-height:1.5;color:#5a5a5a;text-decoration:line-through;text-decoration-color:rgba(237,50,55,.4);",
                )}
              >
                {b.before}
              </p>
              <div
                style={css(
                  "margin:14px 0;display:flex;gap:9px;align-items:flex-start;background:rgba(237,50,55,.06);border-left:3px solid #ed3237;border-radius:0 10px 10px 0;padding:11px 13px;",
                )}
              >
                <span style={css("font-size:15px;")}>🔥</span>
                <span
                  style={css("font-size:13.5px;line-height:1.45;font-weight:600;color:#0f0623;")}
                >
                  {b.roast}
                </span>
              </div>
              <div
                style={css(
                  "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.14em;color:#1f9d55;font-weight:700;",
                )}
              >
                AFTER ✦
              </div>
              <p
                style={css("margin:8px 0 0;font-size:15px;line-height:1.5;font-weight:600;color:#0f0623;")}
              >
                {b.after}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ ROAST SCORE TEASER ============ */}
      <section style={css("background:#f0eeeb;padding:76px 0;")}>
        <div
          style={css(
            "max-width:1140px;margin:0 auto;padding:0 26px;display:flex;flex-wrap:wrap;gap:48px;align-items:center;",
          )}
        >
          <div style={css("flex:1 1 320px;min-width:280px;")}>
            <div
              style={css(
                "display:inline-flex;align-items:center;gap:8px;background:rgba(237,50,55,.1);color:#ed3237;font-weight:700;font-size:13px;padding:7px 13px;border-radius:999px;",
              )}
            >
              📊 THE ROAST SCORE
            </div>
            <h2
              style={css(
                "font-size:clamp(28px,3.6vw,40px);font-weight:900;letter-spacing:-.03em;margin:16px 0 10px;",
              )}
            >
              Find out your Roastability.
            </h2>
            <p style={css("margin:0;color:#5a5a5a;font-size:16px;line-height:1.55;max-width:460px;")}>
              Every résumé gets a buzzword-density score from 0–100 and a letter
              grade. Most people score higher than they&apos;d like.
            </p>
          </div>

          <div
            style={css(
              "flex:1 1 300px;min-width:280px;background:#0f0623;color:#fff;border-radius:24px;padding:28px;box-shadow:0 40px 70px -34px rgba(15,6,35,.6);",
            )}
          >
            <div style={css("display:flex;align-items:flex-end;justify-content:space-between;")}>
              <div>
                <div
                  style={css(
                    "font-size:10px;letter-spacing:.16em;color:rgba(255,255,255,.5);font-weight:700;",
                  )}
                >
                  ROAST SCORE
                </div>
                <div
                  style={css(
                    "font-size:64px;font-weight:900;line-height:1;letter-spacing:-.04em;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);-webkit-background-clip:text;background-clip:text;color:transparent;",
                  )}
                >
                  78
                </div>
              </div>
              <div style={css("text-align:right;")}>
                <div style={css("font-size:42px;font-weight:900;line-height:1;")}>D</div>
                <div
                  style={css(
                    "font-size:11px;color:#f98731;font-weight:700;letter-spacing:.06em;margin-top:4px;",
                  )}
                >
                  CERTIFIED CORPORATE
                </div>
              </div>
            </div>
            <div
              style={css(
                "margin-top:22px;height:9px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;",
              )}
            >
              <div
                style={css(
                  "width:78%;height:100%;border-radius:999px;background:linear-gradient(90deg,#f98731,#ed3237 62%,#ea4c89);",
                )}
              ></div>
            </div>
            <div
              style={css(
                "display:flex;justify-content:space-between;margin-top:10px;font-size:10px;color:rgba(255,255,255,.45);font-family:ui-monospace,Menlo,monospace;letter-spacing:.08em;",
              )}
            >
              <span>CLEAN</span>
              <span>BUZZWORD CRIME SCENE</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PERSONA SHOWCASE ============ */}
      <section style={css("max-width:1140px;margin:0 auto;padding:76px 26px;")}>
        <div style={css("text-align:center;margin-bottom:40px;")}>
          <div
            style={css(
              "display:inline-flex;align-items:center;gap:8px;background:rgba(78,49,136,.08);color:#4e3188;font-weight:700;font-size:13px;padding:7px 13px;border-radius:999px;",
            )}
          >
            🎭 SIX WAYS TO GET DESTROYED
          </div>
          <h2
            style={css(
              "font-size:clamp(28px,3.6vw,40px);font-weight:900;letter-spacing:-.03em;margin:16px 0 8px;",
            )}
          >
            Choose your interrogator.
          </h2>
          <p style={css("margin:0 auto;color:#5a5a5a;font-size:16px;max-width:520px;")}>
            {PERSONA_TAGLINES[taglineIdx]}
          </p>
        </div>

        <div
          style={css(
            "display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;",
          )}
        >
          {PERSONAS.map((p) => (
            <div
              key={p.id}
              style={css(
                "background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 44px -32px rgba(15,6,35,.3);",
              )}
            >
              <div style={css("display:flex;align-items:center;gap:11px;")}>
                <div
                  style={css(
                    "width:42px;height:42px;border-radius:12px;background:#f0eeeb;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;",
                  )}
                >
                  {p.emoji}
                </div>
                <div>
                  <div style={css("font-weight:800;font-size:15px;letter-spacing:-.01em;")}>
                    {p.label}
                  </div>
                  <div style={css("font-size:12px;color:#9c9c9c;")}>{p.desc}</div>
                </div>
              </div>
              <p
                style={css(
                  "margin:0;font-size:13.5px;line-height:1.5;color:#0f0623;font-weight:500;font-style:italic;white-space:pre-line;border-top:1px solid rgba(15,6,35,.07);padding-top:12px;",
                )}
              >
                “{PERSONA_LINES[p.id]}”
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SHARE-CARD PREVIEW ============ */}
      <section style={css("background:#0f0623;color:#fff;padding:76px 0;")}>
        <div
          style={css(
            "max-width:1140px;margin:0 auto;padding:0 26px;display:flex;flex-wrap:wrap;gap:48px;align-items:center;",
          )}
        >
          <div style={css("flex:1 1 320px;min-width:280px;order:2;")}>
            <div
              style={css(
                "display:inline-flex;align-items:center;gap:8px;background:rgba(249,135,49,.16);color:#f98731;font-weight:700;font-size:13px;padding:7px 13px;border-radius:999px;",
              )}
            >
              💀 YOU WALK AWAY WITH THIS
            </div>
            <h2
              style={css(
                "font-size:clamp(28px,3.6vw,40px);font-weight:900;letter-spacing:-.03em;margin:16px 0 10px;",
              )}
            >
              A card built to be screenshotted.
            </h2>
            <p
              style={css(
                "margin:0;color:rgba(255,255,255,.62);font-size:16px;line-height:1.55;max-width:440px;",
              )}
            >
              Your roast comes as a shareable dossier — verdict, score and one dark
              truth. Post it before your group chat finds it.
            </p>
            <button
              onClick={onRoast}
              style={css(
                "margin-top:24px;border:none;cursor:pointer;padding:15px 24px;border-radius:14px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:16px;box-shadow:0 18px 30px -14px rgba(237,50,55,.7);",
              )}
            >
              Make mine →
            </button>
          </div>

          {/* Interrogation-dossier artifact */}
          <div
            style={css("flex:1 1 320px;min-width:280px;order:1;display:flex;justify-content:center;")}
          >
            <div
              style={css(
                "width:320px;background:#141414;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:24px;position:relative;overflow:hidden;box-shadow:0 40px 80px -30px rgba(0,0,0,.7);",
              )}
            >
              <div
                style={css(
                  "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.2em;color:#f98731;font-weight:700;display:flex;justify-content:space-between;",
                )}
              >
                <span>CASE FILE №0847</span>
                <span style={css("color:rgba(255,255,255,.4);")}>CONFIDENTIAL</span>
              </div>
              <div
                style={css("height:1px;background:rgba(255,255,255,.14);margin:14px 0 18px;")}
              ></div>
              <div
                style={css("font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.45);font-weight:700;")}
              >
                CHARGE
              </div>
              <p
                style={css(
                  "margin:6px 0 18px;font-size:18px;line-height:1.3;font-weight:700;color:#fff;",
                )}
              >
                Impersonating a high performer using only adjectives.
              </p>
              <div style={css("display:flex;gap:16px;margin-bottom:18px;")}>
                <div>
                  <div
                    style={css("font-size:10px;letter-spacing:.12em;color:rgba(255,255,255,.45);font-weight:700;")}
                  >
                    SCORE
                  </div>
                  <div style={css("font-size:30px;font-weight:900;color:#ed3237;line-height:1.1;")}>
                    78
                  </div>
                </div>
                <div>
                  <div
                    style={css("font-size:10px;letter-spacing:.12em;color:rgba(255,255,255,.45);font-weight:700;")}
                  >
                    GRADE
                  </div>
                  <div style={css("font-size:30px;font-weight:900;color:#f98731;line-height:1.1;")}>
                    D
                  </div>
                </div>
                <div style={css("flex:1;")}>
                  <div
                    style={css("font-size:10px;letter-spacing:.12em;color:rgba(255,255,255,.45);font-weight:700;")}
                  >
                    VERDICT
                  </div>
                  <div style={css("font-size:13px;font-weight:700;color:#fff;line-height:1.25;margin-top:4px;")}>
                    Certified Corporate
                  </div>
                </div>
              </div>
              <div style={css("display:flex;justify-content:space-between;align-items:center;")}>
                <span
                  style={css("font-size:11px;color:rgba(255,255,255,.5);font-weight:700;")}
                >
                  🔥 burntcv
                </span>
                <span style={css("font-size:11px;color:#f98731;font-weight:700;")}>
                  roast yours →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section style={css("max-width:760px;margin:0 auto;padding:76px 26px;")}>
        <h2
          style={css(
            "font-size:clamp(28px,3.6vw,40px);font-weight:900;letter-spacing:-.03em;margin:0 0 28px;text-align:center;",
          )}
        >
          Questions you&apos;re too proud to ask.
        </h2>
        <div style={css("display:flex;flex-direction:column;gap:12px;")}>
          {FAQ.map((f, i) => (
            <details
              key={i}
              style={css(
                "background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:14px;padding:16px 18px;",
              )}
            >
              <summary
                style={css(
                  "cursor:pointer;font-weight:700;font-size:15.5px;color:#0f0623;list-style:none;",
                )}
              >
                {f.q}
              </summary>
              <p style={css("margin:10px 0 0;font-size:14.5px;line-height:1.55;color:#5a5a5a;")}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ HARD CTA ============ */}
      <section style={css("max-width:1140px;margin:0 auto;padding:0 26px 90px;")}>
        <div
          style={css(
            "background:linear-gradient(120deg,#0f0623,#2a1147 70%);border-radius:28px;padding:clamp(40px,6vw,68px) 30px;text-align:center;position:relative;overflow:hidden;",
          )}
        >
          <div
            style={css(
              "position:absolute;top:-80px;right:-40px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(249,135,49,.45),transparent 68%);filter:blur(10px);",
            )}
          ></div>
          <div style={css("position:relative;")}>
            <h2
              style={css(
                "font-size:clamp(30px,4.4vw,50px);font-weight:900;letter-spacing:-.035em;color:#fff;margin:0 0 14px;line-height:1.05;",
              )}
            >
              Your résumé is funnier than you think.
            </h2>
            <p
              style={css(
                "margin:0 auto 28px;color:rgba(255,255,255,.66);font-size:17px;max-width:440px;",
              )}
            >
              Find out exactly how. First roast is free. Under 30 seconds.
            </p>
            <button
              onClick={onRoast}
              style={css(
                "border:none;cursor:pointer;padding:19px 34px;border-radius:16px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:18px;box-shadow:0 20px 40px -14px rgba(237,50,55,.7);",
              )}
            >
              Roast my résumé →
            </button>
            <div
              style={css(
                "margin-top:16px;font-size:12.5px;color:rgba(255,255,255,.5);",
              )}
            >
              🔒 Roasted and forgotten — never stored.
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// A single infinite-scroll marquee row for the Wall of Flame. The list is
// duplicated so the -50% translate loops seamlessly.
function MarqueeRow({ items, reverse }: { items: string[]; reverse: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div style={css("overflow:hidden;width:100%;")}>
      <div
        style={css(
          `display:flex;gap:16px;width:max-content;animation:marquee 42s linear infinite;${reverse ? "animation-direction:reverse;" : ""}`,
        )}
      >
        {doubled.map((line, i) => (
          <div
            key={i}
            style={css(
              "flex:0 0 auto;width:320px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px 18px;",
            )}
          >
            <p
              style={css("margin:0;font-size:14px;line-height:1.45;color:rgba(255,255,255,.9);font-weight:500;")}
            >
              {line}
            </p>
            <div
              style={css(
                "margin-top:10px;font-size:10px;letter-spacing:.1em;color:#f98731;font-weight:700;font-family:ui-monospace,Menlo,monospace;",
              )}
            >
              🔥 BURNTCV
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
