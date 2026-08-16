import type { Metadata } from "next";
import Link from "next/link";
import { css } from "@/components/css";

export const metadata: Metadata = {
  title: "BurntCV Hire — Privacy & Data Promise",
  description:
    "How BurntCV Hire handles candidate data: consent-based screening, purpose limitation, retention with real deletion, and a hard wall from the BurntCV roast product.",
};

const INK = "#101828";
const MUTED = "#475467";

// The Hire data promise — deliberately a SEPARATE document from the roast's
// privacy policy (PRD-Hire §16): the two products make different promises and
// each page states only what is true of that product.
const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "The short version",
    body: (
      <>
        BurntCV Hire stores candidate data <strong>on behalf of your recruiting
        team, for one purpose: screening candidates for the role you created.</strong>{" "}
        A human makes every decision. Data is deleted on your retention schedule or
        on request — whichever comes first. Candidate data is never used to train
        models, never shared across accounts, and never touches the BurntCV roast
        product.
      </>
    ),
  },
  {
    title: "What we store, and for whom",
    body: (
      <>
        When a recruiter adds a candidate, we store the résumé text, the structured
        extraction, the fit report, and any decision + note — all owned by the
        recruiter&apos;s account (the data fiduciary). BurntCV Hire is the processor.
        Every record is scoped to that account; cross-account access is impossible by
        construction.
      </>
    ),
  },
  {
    title: "Consent & lawful basis (DPDP)",
    body: (
      <>
        Before screening, the recruiter attests a lawful basis per candidate: the
        candidate applied to this role, or the recruiter otherwise holds consent.
        The attestation — who, when, and on what basis — is recorded in the
        account&apos;s audit trail. Processing is limited to <em>role screening</em>;
        there is no secondary use.
      </>
    ),
  },
  {
    title: "Human-in-the-loop, always",
    body: (
      <>
        The system never rejects anyone. It produces evidence-cited analysis; every
        Advance / Hold / Pass is recorded by a named, signed-in human. Knockout
        failures are flagged for review, never auto-actioned.
      </>
    ),
  },
  {
    title: "Retention & deletion",
    body: (
      <>
        Candidate records carry a purge deadline (default 180 days, configurable
        7–365) and are deleted automatically when it passes. Recruiters can hard-delete
        any candidate, any role, or the entire account&apos;s data at any time — deletions
        are immediate and logged. Candidates may exercise access or erasure rights via
        the recruiter, who can export or delete their record in one click.
      </>
    ),
  },
  {
    title: "The wall between Hire and the roast",
    body: (
      <>
        The consumer roast product&apos;s promise is &ldquo;we never store your
        résumé&rdquo; — and it still holds. Hire runs on a separate data plane with its
        own storage namespace. No résumé, pipeline, or table is shared in either
        direction. A roasted résumé never becomes a Hire candidate; a Hire candidate is
        never roasted.
      </>
    ),
  },
  {
    title: "Security",
    body: (
      <>
        Data is encrypted in transit (TLS) and at rest by our storage provider.
        Sessions are signed and scoped to one account. LLM calls for screening go to
        Anthropic&apos;s API under a zero-retention posture for inputs; candidate data is
        not used to train models. Rate limits cap abuse per account and per IP.
      </>
    ),
  },
  {
    title: "Contact & rights requests",
    body: (
      <>
        For access, correction, or erasure requests — or anything about this policy —
        email <a href="mailto:support@burntcv.fun" style={{ color: "#1a56db" }}>support@burntcv.fun</a>.
        We respond to data-subject requests within 30 days.
      </>
    ),
  },
];

export default function HirePrivacyPage() {
  return (
    <div style={css("min-height:100vh;background:#f7f8fa;")}>
      <div style={css("max-width:760px;margin:0 auto;padding:40px 26px 70px;")}>
        <Link
          href="/hire"
          style={css("text-decoration:none;font-size:13.5px;font-weight:700;color:#1a56db;")}
        >
          ← BurntCV Hire
        </Link>
        <h1
          style={css(
            `font-size:clamp(28px,4vw,40px);font-weight:900;letter-spacing:-.03em;margin:18px 0 6px;color:${INK};`,
          )}
        >
          Privacy &amp; Data Promise
        </h1>
        <div
          style={css(
            "font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#98a2b3;margin:0 0 30px;",
          )}
        >
          BurntCV Hire · effective 15 Aug 2026 · applies only to the Hire product
        </div>
        {SECTIONS.map((s) => (
          <section key={s.title} style={css("margin:0 0 26px;")}>
            <h2
              style={css(
                `font-size:17px;font-weight:800;letter-spacing:-.01em;margin:0 0 8px;color:${INK};`,
              )}
            >
              {s.title}
            </h2>
            <p style={css(`font-size:14.5px;line-height:1.65;color:${MUTED};margin:0;`)}>
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
