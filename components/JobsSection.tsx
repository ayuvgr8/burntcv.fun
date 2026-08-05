"use client";

// The Glow-Up's live openings section. Split out of BurntCV.tsx because every
// line of it is a factual claim about the outside world, and those need to be
// readable in one place — this is the only part of the product that can be
// wrong about something the user can go and check.
//
// The honesty rules it enforces (docs/jobs-feed-spec.md §7):
//   • Dates are whatever the source said. Nothing is ever inferred.
//   • We say "live as of <timestamp>", never "still open" — a role can be
//     filled internally an hour after we look and we'd have no idea.
//   • Boards we can't verify (LinkedIn, Indeed, Glassdoor — Firecrawl refuses
//     them) say so plainly instead of quietly rendering as unchecked.
//   • The count is whatever survived filtering. Five is a target, not a promise.

import { css } from "./css";
import type { Job, JobsPayload, VerifyStatus } from "@/lib/jobs";

export type JobCheck = { status: VerifyStatus | "checking"; checkedAt?: string };

const GLOW_LABEL =
  "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.14em;font-weight:700;color:#0f0623;";
const PILL =
  "background:rgba(15,6,35,.05);color:#565656;border-radius:999px;padding:4px 9px;font-size:10.5px;font-weight:700;";

// How old a posting is, from the date the SOURCE gave us. A job with no date is
// dropped server-side rather than shown with a guess.
export function agoLabel(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "recently";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "posted today";
  if (days === 1) return "posted yesterday";
  return `posted ${days} days ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// When we actually looked — the claim is "live at this moment", nothing more.
//
// Formatted by hand rather than with toLocaleString: the runtime resolves the
// locale differently on each side (Node gives "Aug 5, 06:17 PM", the browser
// "5 Aug, 18:17"), which is a hydration mismatch waiting for the first person
// who renders this server-side. Explicit formatting makes the output identical
// everywhere.
export function timeLabel(iso?: string): string {
  if (!iso) return "just now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "just now";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The one line that must never overstate what we know.
function statusLine(job: Job, check?: JobCheck): string {
  if (!job.verifiable) {
    return `⚠️ We can't check ${job.via} postings from here — confirm it's still open before you spend time on it.`;
  }
  switch (check?.status) {
    case "checking":
      return "Checking whether it's still open…";
    case "live":
      return `✅ Live as of ${timeLabel(check.checkedAt)} — a role can still be filled internally, so move quickly.`;
    case "closed":
      return "🚫 This one looks closed now. Sorry — job boards go stale fast.";
    default:
      return "⚠️ Couldn't confirm this one either way. Worth a click to check.";
  }
}

export default function JobsSection({
  jobs,
  loading,
  openJob,
  checks,
  onToggle,
  onApply,
}: {
  jobs: JobsPayload | null;
  loading: boolean;
  openJob: number;
  checks: Record<string, JobCheck>;
  onToggle: (index: number, job: Job) => void;
  onApply?: (job: Job) => void;
}) {
  const list = jobs?.jobs ?? [];

  return (
    <div>
      <div
        style={css(
          "display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:4px;",
        )}
      >
        <div style={css(GLOW_LABEL)}>📮 SEND IT HERE</div>
        {list.length > 0 && (
          <span style={css("font-size:11px;font-weight:700;color:#9c9c9c;flex:none;")}>
            {jobs?.broadened ? "LAST 30 DAYS" : "POSTED THIS WEEK"}
          </span>
        )}
      </div>
      {/* Suppressed when there's nothing to tap — "tap one to check it's still
          open" sitting above "we found nothing" reads like a broken page. */}
      {(loading || list.length > 0) && (
        <p style={css("margin:0 0 10px;font-size:12.5px;color:#5a5a5a;line-height:1.45;")}>
          {loading
            ? "Searching live job boards for openings that match this résumé — this takes a few seconds."
            : jobs?.broadened
              ? "Nothing matched in the last 7 days, so this is the last 30 — still worth a shot."
              : "Live openings matched to your role and stack. Tap one to check it's still open."}
        </p>
      )}

      {/* Three placeholder cards shaped like the real thing. Discovery takes
          7-11s against the live job APIs, and a bare "Searching…" for that long
          reads as a section that failed. Skeletons make the wait legible and
          tell the user what's about to appear. */}
      {loading && (
        <div style={css("display:flex;flex-direction:column;gap:9px;")}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bcv-skel"
              style={css(
                "border:1px solid rgba(15,6,35,.07);border-radius:14px;padding:13px 14px;background:#fff;",
              )}
            >
              <div style={css("height:14px;width:62%;background:rgba(15,6,35,.10);border-radius:5px;")} />
              <div
                style={css(
                  "height:11px;width:42%;background:rgba(15,6,35,.07);border-radius:5px;margin-top:8px;",
                )}
              />
              <div style={css("display:flex;gap:6px;margin-top:11px;")}>
                <div style={css("height:19px;width:74px;background:rgba(15,6,35,.06);border-radius:999px;")} />
                <div style={css("height:19px;width:58px;background:rgba(15,6,35,.06);border-radius:999px;")} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && jobs && list.length === 0 && (
        <div
          style={css(
            "border:1px dashed rgba(15,6,35,.16);border-radius:14px;padding:15px 16px;font-size:12.5px;color:#6a6a6a;line-height:1.5;",
          )}
        >
          {jobs.degraded === "quota"
            ? "Job matching is taking a breather — it'll be back tomorrow. The rest of your Glow-Up is unaffected."
            : "No fresh postings matched this exact role and location. Widen the target role and run this again — or check back in a few days."}
        </div>
      )}

      {/* Single column on purpose, unlike the sibling project/company grids.
          These cards expand into a reason block plus a full-width apply button,
          and in a 2-up grid an open card leaves a ragged hole beside it while
          squeezing its own content. A scannable list reads better for "here are
          five, tap one". */}
      {!loading && list.length > 0 && (
        <div style={css("display:flex;flex-direction:column;gap:9px;")}>
          {list.map((j, i) => {
            const open = openJob === i;
            const check = checks[j.id];
            return (
              <div
                key={j.id}
                style={css(
                  "border-radius:14px;overflow:hidden;background:#fff;transition:border-color .15s;" +
                    (open
                      ? "border:1.5px solid rgba(78,49,136,.45);"
                      : "border:1px solid rgba(15,6,35,.1);"),
                )}
              >
                <div onClick={() => onToggle(i, j)} style={css("cursor:pointer;padding:13px 14px;")}>
                  <div style={css("display:flex;align-items:flex-start;gap:10px;")}>
                    <div style={css("flex:1;min-width:0;")}>
                      <div style={css("font-size:14px;font-weight:700;color:#0f0623;line-height:1.35;")}>
                        {j.title}
                      </div>
                      <div style={css("margin-top:3px;font-size:12.5px;color:#5a5a5a;line-height:1.4;")}>
                        {j.company}
                        {j.location ? ` · ${j.location}` : ""}
                        {j.remote ? " · remote" : ""}
                      </div>
                    </div>
                    <span
                      style={css(
                        "flex:none;color:#9c9c9c;font-size:13px;transition:transform .15s;" +
                          (open ? "transform:rotate(90deg);" : ""),
                      )}
                    >
                      ›
                    </span>
                  </div>
                  <div style={css("display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;")}>
                    <span style={css(PILL)}>{agoLabel(j.postedAt)}</span>
                    <span style={css(PILL)}>via {j.via}</span>
                    {j.salary && (
                      <span
                        style={css(
                          "background:rgba(31,138,91,.1);color:#1f8a5b;border-radius:999px;padding:4px 9px;font-size:10.5px;font-weight:700;",
                        )}
                      >
                        {j.salary}
                      </span>
                    )}
                  </div>
                </div>

                {open && (
                  <div style={css("padding:0 14px 13px;display:flex;flex-direction:column;gap:10px;")}>
                    {j.matchReason && (
                      <div
                        style={css(
                          "background:rgba(78,49,136,.05);border:1px solid rgba(78,49,136,.16);border-radius:11px;padding:10px 12px;",
                        )}
                      >
                        <div
                          style={css(
                            "font-size:9px;font-weight:800;letter-spacing:.1em;color:#4e3188;margin-bottom:4px;",
                          )}
                        >
                          WHY THIS ONE
                        </div>
                        <div style={css("font-size:12.5px;color:#0f0623;line-height:1.5;")}>
                          {j.matchReason}
                        </div>
                      </div>
                    )}

                    <div style={css("font-size:11.5px;line-height:1.45;color:#6a6a6a;")}>
                      {statusLine(j, check)}
                    </div>

                    <a
                      href={j.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      onClick={() => onApply?.(j)}
                      style={css(
                        "display:block;text-align:center;text-decoration:none;background:#0f0623;color:#fff;border-radius:11px;padding:11px 14px;font-size:13px;font-weight:700;",
                      )}
                    >
                      Apply on {j.via} →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
