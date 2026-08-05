"use client";

import { useState } from "react";
import JobsSection, { type JobCheck } from "@/components/JobsSection";
import type { Job, JobsPayload } from "@/lib/jobs";

// Fixed timestamps, not now-relative. An earlier version built these with
// new Date() during render, so the server and the browser produced different
// strings and the page hydration-mismatched. Fixtures must be deterministic.
const DAY = 86_400_000;
// Anchored to midnight so "posted N days ago" is stable within a run.
const BASE = Math.floor(Date.now() / DAY) * DAY;
const ago = (days: number) => new Date(BASE - days * DAY).toISOString();
const CHECKED_AT = new Date(BASE + 15 * 60 * 60 * 1000 + 22 * 60 * 1000).toISOString();

// Shaped after real JSearch output, including the awkward parts: a LinkedIn URL
// we can never verify, a company-careers URL we can, and a posting whose city
// differs from the candidate's.
const JOBS: Job[] = [
  {
    id: "js-0",
    title: "Senior Frontend Engineer",
    company: "Electrolux Group",
    location: "Bengaluru, Karnataka",
    remote: false,
    postedAt: ago(0),
    applyUrl: "https://career.electroluxgroup.com/global/en/job/EISAGLOBALJR76106/Senior-Frontend-Engineer",
    source: "jsearch",
    via: "company site",
    verifiable: true,
    matchReason:
      "Senior Frontend Engineer role in Bengaluru; React and TypeScript are core to the posting and match your four years of production work.",
    salary: "₹28–42k",
  },
  {
    id: "js-1",
    title: "Senior Engineer (Frontend), API Builder",
    company: "Postman",
    location: "Bengaluru, Karnataka",
    remote: false,
    postedAt: ago(1),
    applyUrl: "https://in.linkedin.com/jobs/view/senior-engineer-frontend-4441530381",
    source: "jsearch",
    via: "LinkedIn",
    verifiable: false,
    matchReason:
      "API platform context lines up with your fintech integration work; seniority bracket fits your four years.",
  },
  {
    id: "js-2",
    title: "Front End Development React",
    company: "Cloudxtreme",
    location: "Bengaluru, Karnataka",
    remote: true,
    postedAt: ago(4),
    applyUrl: "https://www.shine.com/jobs/front-end-development-react/cloudxtreme/19338394",
    source: "jsearch",
    via: "Shine",
    verifiable: true,
    matchReason:
      "Expects an SME-level React contributor, the closest match to your current impact level.",
  },
];

const CASES: { label: string; note: string; payload: JobsPayload | null; loading: boolean; open: number; checks: Record<string, JobCheck> }[] = [
  {
    label: "1 · loading",
    note: "Discovery takes 7-11s against the live APIs. Skeletons, not a spinner.",
    payload: null,
    loading: true,
    open: -1,
    checks: {},
  },
  {
    label: "2 · loaded · card open · verified live",
    note: "Verification is lazy — it fires only when a card is expanded.",
    payload: { jobs: JOBS, fetchedAt: CHECKED_AT },
    loading: false,
    open: 0,
    checks: { "js-0": { status: "live", checkedAt: CHECKED_AT } },
  },
  {
    label: "3 · unverifiable (LinkedIn) card open",
    note: "Firecrawl refuses LinkedIn outright, so the card says so rather than implying a check.",
    payload: { jobs: JOBS, fetchedAt: CHECKED_AT },
    loading: false,
    open: 1,
    checks: {},
  },
  {
    label: "4 · closed card open",
    note: "Dead postings often 200-redirect to a homepage; we detect that and say closed.",
    payload: { jobs: JOBS, fetchedAt: CHECKED_AT },
    loading: false,
    open: 2,
    checks: { "js-2": { status: "closed", checkedAt: CHECKED_AT } },
  },
  {
    label: "5 · checking…",
    note: "The moment between expanding a card and the verify call returning.",
    payload: { jobs: JOBS, fetchedAt: CHECKED_AT },
    loading: false,
    open: 0,
    checks: { "js-0": { status: "checking" } },
  },
  {
    label: "6 · broadened (last 30 days)",
    note: "Fires when a 7-day search comes back thin. The header and copy both change.",
    payload: { jobs: JOBS, broadened: true, fetchedAt: CHECKED_AT },
    loading: false,
    open: -1,
    checks: {},
  },
  {
    label: "7 · empty · no results",
    note: "Nothing matched. Note the 'tap one' line is suppressed — there's nothing to tap.",
    payload: { jobs: [], degraded: "no_results", fetchedAt: "" },
    loading: false,
    open: -1,
    checks: {},
  },
  {
    label: "8 · empty · quota exhausted",
    note: "Third-party monthly quota spent. Says so without blaming the Glow-Up.",
    payload: { jobs: [], degraded: "quota", fetchedAt: "" },
    loading: false,
    open: -1,
    checks: {},
  },
];

export default function Preview() {
  const [live, setLive] = useState(-1);
  const [liveChecks, setLiveChecks] = useState<Record<string, JobCheck>>({});

  return (
    <div
      style={{
        padding: "28px 16px 60px",
        background: "#f3f2f5",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto 26px" }}>
        <h1 style={{ margin: 0, fontSize: 21, color: "#0f0623" }}>Jobs section — all states</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5a5a5a", lineHeight: 1.5 }}>
          Dev-only fixture gallery for <code>components/JobsSection.tsx</code>. This route 404s in
          production. Everything below is fixture data — no API calls.
        </p>
      </div>

      {/* Interactive one first, so expand/collapse can actually be clicked. */}
      <section style={card}>
        <h2 style={h2}>0 · interactive — click a card</h2>
        <p style={note}>Expand and collapse behave exactly as in the real report.</p>
        <JobsSection
          jobs={{ jobs: JOBS, fetchedAt: CHECKED_AT }}
          loading={false}
          openJob={live}
          checks={liveChecks}
          onToggle={(i, j) => {
            const next = live === i ? -1 : i;
            setLive(next);
            if (next < 0 || !j.verifiable || liveChecks[j.id]) return;
            setLiveChecks((m) => ({ ...m, [j.id]: { status: "checking" } }));
            setTimeout(
              () =>
                setLiveChecks((m) => ({
                  ...m,
                  [j.id]: { status: "live", checkedAt: CHECKED_AT },
                })),
              900,
            );
          }}
        />
      </section>

      {CASES.map((c) => (
        <section key={c.label} style={card}>
          <h2 style={h2}>{c.label}</h2>
          <p style={note}>{c.note}</p>
          <JobsSection
            jobs={c.payload}
            loading={c.loading}
            openJob={c.open}
            checks={c.checks}
            onToggle={() => {}}
          />
        </section>
      ))}
    </div>
  );
}

const card: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto 22px",
  padding: "16px 18px 20px",
  background: "#faf9fb",
  border: "1px solid rgba(15,6,35,.08)",
  borderRadius: 16,
};
const h2: React.CSSProperties = {
  margin: "0 0 3px",
  fontSize: 13,
  fontWeight: 700,
  color: "#4e3188",
  fontFamily: "ui-monospace, Menlo, monospace",
};
const note: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 12,
  color: "#7a7a7a",
  lineHeight: 1.45,
};
