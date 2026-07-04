import { css } from "./css";

// Dedicated SEO landing for "linkedin roast generator" — a second viral front
// door. Server component (static, no client JS): CTAs are plain links that
// deep-link into the app's LinkedIn flow via ?li=1.
export default function LinkedInLanding() {
  return (
    <div
      style={css(
        "min-height:100vh;background:radial-gradient(120% 80% at 80% -10%,rgba(0,119,181,.09),transparent 50%),#f7f6f4;",
      )}
    >
      <div
        style={css(
          "max-width:1140px;margin:0 auto;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;",
        )}
      >
        <a href="/" style={css("display:flex;align-items:center;gap:9px;")}>
          <span style={css("font-size:21px;")}>🔥</span>
          <div>
            <div style={css("font-weight:900;font-size:19px;letter-spacing:-.02em;")}>BurntCV</div>
            <div
              style={css(
                "font-family:ui-monospace,Menlo,monospace;font-size:8.5px;letter-spacing:.2em;color:#9c9c9c;margin-top:-2px;",
              )}
            >
              // SCREWED IT
            </div>
          </div>
        </a>
        <a
          href="/?li=1"
          style={css(
            "border:none;cursor:pointer;background:#0077b5;color:#fff;font-weight:700;font-size:14px;padding:11px 18px;border-radius:11px;",
          )}
        >
          Roast my LinkedIn
        </a>
      </div>

      <div
        style={css(
          "max-width:1140px;margin:0 auto;padding:24px 26px 70px;display:flex;flex-wrap:wrap;gap:48px;align-items:center;",
        )}
      >
        <div style={css("flex:1 1 380px;min-width:300px;display:flex;flex-direction:column;gap:22px;")}>
          <div
            style={css(
              "display:inline-flex;align-self:flex-start;align-items:center;gap:8px;background:rgba(0,119,181,.09);color:#0077b5;font-weight:700;font-size:13px;padding:8px 14px;border-radius:999px;",
            )}
          >
            🔗 The LinkedIn Roast Generator
          </div>
          <h1
            style={css(
              "font-size:clamp(38px,5.4vw,60px);line-height:1.03;font-weight:900;letter-spacing:-.035em;margin:0;",
            )}
          >
            Your LinkedIn is a{" "}
            <span
              style={css(
                "background:linear-gradient(115deg,#0077b5,#4e3188 55%,#ea4c89);-webkit-background-clip:text;background-clip:text;color:transparent;",
              )}
            >
              cringe goldmine
            </span>
            . Let&apos;s roast it.
          </h1>
          <p
            style={css(
              "margin:0;font-size:clamp(16px,1.5vw,19px);line-height:1.55;color:#5a5a5a;max-width:520px;",
            )}
          >
            Paste your LinkedIn profile and get a brutally honest, very funny roast of your
            headline, your third-person &quot;About,&quot; the engagement bait, and every
            &quot;humbled and honored&quot; you&apos;ve ever posted.{" "}
            <span style={css("white-space:nowrap;")}>Under 30 seconds. 🌑</span>
          </p>
          <div style={css("display:flex;flex-wrap:wrap;gap:12px;align-items:center;")}>
            <a
              href="/?li=1"
              style={css(
                "border:none;cursor:pointer;padding:17px 26px;border-radius:15px;background:linear-gradient(115deg,#0077b5,#4e3188 62%,#ea4c89);color:#fff;font-weight:800;font-size:17px;display:flex;align-items:center;gap:10px;box-shadow:0 18px 30px -12px rgba(0,119,181,.5);",
              )}
            >
              Roast my LinkedIn →
            </a>
            <a
              href="/"
              style={css(
                "border:1.5px solid rgba(15,6,35,.16);background:#fff;cursor:pointer;padding:17px 22px;border-radius:15px;color:#0f0623;font-weight:700;font-size:16px;",
              )}
            >
              Roast a résumé instead
            </a>
          </div>
          <div
            style={css(
              "display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:#808080;",
            )}
          >
            <span>PASTE URL</span>
            <span style={css("color:#0077b5;")}>→</span>
            <span>COPY 3 SECTIONS</span>
            <span style={css("color:#0077b5;")}>→</span>
            <span>GET DESTROYED</span>
          </div>
          <div style={css("font-size:12.5px;color:#9c9c9c;display:flex;gap:7px;align-items:center;")}>
            🔒 We never scrape LinkedIn — you paste it, we roast it, then forget it.
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
                "position:absolute;bottom:-60px;left:-30px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(0,119,181,.5),rgba(78,49,136,.12) 55%,transparent 72%);filter:blur(8px);",
              )}
            ></div>
            <div style={css("position:relative;")}>
              <div style={css("display:flex;align-items:center;justify-content:space-between;")}>
                <div style={css("display:flex;align-items:center;gap:6px;font-weight:900;font-size:14px;")}>
                  🔥 BurntCV
                </div>
                <span
                  style={css(
                    "font-size:9px;letter-spacing:.12em;color:#0077b5;font-weight:700;border:1px solid rgba(0,119,181,.6);border-radius:999px;padding:3px 8px;",
                  )}
                >
                  LINKEDIN ROAST
                </span>
              </div>
              <p style={css("margin:22px 0 0;font-size:21px;line-height:1.28;font-weight:700;letter-spacing:-.01em;")}>
                &quot;Visionary | Disruptor | Coffee Lover&quot; — four identities, none of them
                a job title.
              </p>
              <div style={css("height:1px;background:rgba(255,255,255,.14);margin:22px 0;")}></div>
              <div style={css("font-size:10px;letter-spacing:.14em;font-weight:700;color:#f98731;")}>
                🌑 DARK TRUTH
              </div>
              <p style={css("margin:8px 0 0;font-size:13.5px;line-height:1.45;color:rgba(255,255,255,.92);")}>
                500+ connections, 2% engagement — a network the size of a small town that
                collectively ignores you.
              </p>
              <div
                style={css(
                  "display:flex;align-items:center;justify-content:space-between;margin-top:22px;font-size:11px;color:rgba(255,255,255,.55);",
                )}
              >
                <span>burntcv.app/linkedin</span>
                <span style={css("color:#fff;font-weight:700;")}>roast yours →</span>
              </div>
            </div>
          </div>
          <div
            style={css(
              "position:absolute;top:6px;left:-6px;transform:rotate(-8deg);width:190px;background:#fff;border:1px solid rgba(15,6,35,.1);border-left:4px solid #0077b5;border-radius:12px;padding:11px 13px;box-shadow:0 16px 28px -14px rgba(15,6,35,.34);font-size:12px;line-height:1.4;font-weight:500;",
            )}
          >
            &quot;You were &apos;humbled and honored&apos; in 14-point bold. The font size and the
            humility are in conflict.&quot;
          </div>
          <div
            style={css(
              "position:absolute;bottom:18px;right:-10px;transform:rotate(7deg);width:172px;background:#fff;border:1px solid rgba(15,6,35,.1);border-radius:12px;padding:11px 13px;box-shadow:0 16px 28px -14px rgba(15,6,35,.34);font-size:12px;line-height:1.4;font-weight:500;",
            )}
          >
            <span style={css("color:#0077b5;font-weight:800;font-size:9px;letter-spacing:.1em;")}>
              VERDICT
            </span>
            <br />A personality in bullet points, still searching for a job title.
          </div>
        </div>
      </div>

      {/* What we roast — SEO body content */}
      <div style={css("max-width:1140px;margin:0 auto;padding:0 26px 80px;")}>
        <div
          style={css(
            "font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.16em;font-weight:700;color:#0077b5;margin-bottom:18px;",
          )}
        >
          WHAT THE LINKEDIN ROAST GOES AFTER
        </div>
        <div
          style={css(
            "display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;",
          )}
        >
          {[
            ["🎭 The identity-stack headline", "“Visionary | Disruptor | Thought Leader | Dog Dad” — four titles, zero jobs."],
            ["🗣️ The third-person “About”", "Narrating your own life like a wildlife documentary."],
            ["🎣 Engagement bait", "“Agree? 👇”, “Sad to announce…”, “I’m humbled and honored.”"],
            ["🤝 The connection flex", "500+ connections and an engagement rate that rounds to zero."],
            ["📢 Buzzword density", "Synergy, leverage, disrupt, ninja, rockstar, guru — the full bingo card."],
            ["🟢 The “Open to Work” irony", "The green ring vs. last year’s “we’re hiring rockstars!!” post."],
          ].map(([title, body]) => (
            <div
              key={title}
              style={css(
                "background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:16px;padding:18px;",
              )}
            >
              <div style={css("font-weight:800;font-size:15px;margin-bottom:7px;")}>{title}</div>
              <div style={css("font-size:13px;color:#5a5a5a;line-height:1.5;")}>{body}</div>
            </div>
          ))}
        </div>

        <div style={css("margin-top:36px;display:flex;justify-content:center;")}>
          <a
            href="/?li=1"
            style={css(
              "border:none;cursor:pointer;padding:17px 30px;border-radius:15px;background:linear-gradient(115deg,#0077b5,#4e3188 62%,#ea4c89);color:#fff;font-weight:800;font-size:17px;box-shadow:0 18px 30px -12px rgba(0,119,181,.5);",
            )}
          >
            Roast my LinkedIn profile →
          </a>
        </div>
      </div>
    </div>
  );
}
