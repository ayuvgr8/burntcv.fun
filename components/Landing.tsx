"use client";

import { css } from "./css";

export default function Landing({
  onRoast,
  onLinkedIn,
}: {
  onRoast: () => void;
  onLinkedIn: () => void;
}) {
  return (
    <div
      style={css(
        "min-height:100vh;background:radial-gradient(120% 80% at 80% -10%,rgba(234,76,137,.07),transparent 50%),#f7f6f4;",
      )}
    >
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
          <span style={css("font-size:14px;font-weight:600;color:#5a5a5a;cursor:pointer;")}>
            Sign in
          </span>
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

      <div
        style={css(
          "max-width:1140px;margin:0 auto;padding:24px 26px 70px;display:flex;flex-wrap:wrap;gap:48px;align-items:center;",
        )}
      >
        <div
          style={css(
            "flex:1 1 380px;min-width:300px;display:flex;flex-direction:column;gap:22px;",
          )}
        >
          <div
            style={css(
              "display:inline-flex;align-self:flex-start;align-items:center;gap:8px;background:rgba(78,49,136,.08);color:#4e3188;font-weight:700;font-size:13px;padding:8px 14px;border-radius:999px;",
            )}
          >
            🔥 48,210 résumés roasted this week
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
              onClick={onLinkedIn}
              style={css(
                "border:1.5px solid rgba(15,6,35,.16);background:#fff;cursor:pointer;padding:17px 22px;border-radius:15px;color:#0f0623;font-weight:700;font-size:16px;",
              )}
            >
              Roast my LinkedIn
            </button>
          </div>
          <div
            style={css(
              "display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:#808080;",
            )}
          >
            <span>PASTE</span>
            <span style={css("color:#ea4c89;")}>→</span>
            <span>PICK YOUR ROASTER</span>
            <span style={css("color:#ea4c89;")}>→</span>
            <span>GET DESTROYED</span>
          </div>
          <div
            style={css(
              "font-size:12.5px;color:#9c9c9c;display:flex;gap:7px;align-items:center;",
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

        <div
          style={css(
            "flex:1 1 340px;min-width:300px;position:relative;display:flex;justify-content:center;align-items:center;min-height:460px;",
          )}
        >
          <div
            style={css(
              "width:312px;background:#0f0623;border-radius:26px;padding:26px;color:#fff;position:relative;overflow:hidden;box-shadow:0 40px 70px -28px rgba(15,6,35,.6);",
            )}
          >
            <div
              style={css(
                "position:absolute;bottom:-60px;left:-30px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(249,135,49,.5),rgba(237,50,55,.1) 55%,transparent 72%);filter:blur(8px);animation:ember 4s ease-in-out infinite;",
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
                    "font-size:9px;letter-spacing:.12em;color:#f98731;font-weight:700;border:1px solid rgba(249,135,49,.5);border-radius:999px;padding:3px 8px;",
                  )}
                >
                  MEDIUM ROAST
                </span>
              </div>
              <p
                style={css(
                  "margin:22px 0 0;font-size:22px;line-height:1.28;font-weight:700;letter-spacing:-.01em;",
                )}
              >
                &quot;A document that confidently says nothing, in Calibri.&quot;
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
                The two-year gap is the most honest line on the page. The ATS
                bot, tragically, has no soul.
              </p>
              <div
                style={css(
                  "display:flex;align-items:center;justify-content:space-between;margin-top:22px;font-size:11px;color:rgba(255,255,255,.55);",
                )}
              >
                <span>burntcv.app</span>
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
    </div>
  );
}
