// BurntCV Pro — the candidate-facing coaching stage.
//
// Same engine as Hire (decompose/extract/rate contracts in lib/hire/prompts.ts
// are reused verbatim); only this final stage differs by audience. Where Hire
// hands the recruiter interview questions to PROBE gaps, Pro hands the
// candidate concrete edits to CLOSE them — same gap data, opposite side of the
// table.
//
// Honesty is the hard constraint here: coaching a résumé must never become
// coaching a lie. The contract forbids inventing experience and frames every
// fix as "surface what's true and provable", with an explicit "only if true"
// on anything the résumé doesn't already support.

import type { DimensionScore, Requirement } from "../hire/types";

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

export interface WeakDim {
  requirement: Requirement;
  dim: DimensionScore;
}

export function coachContract(
  weakDims: WeakDim[],
  roleTitle: string,
  unparsedSections: string[],
): { system: string; prompt: string } {
  const gapList = weakDims
    .map(
      (w) =>
        `- requirementId: ${w.requirement.id}\n  requirement: ${w.requirement.label} (${w.requirement.category}${w.requirement.isKnockout ? ", AUTO-FILTER RISK" : ""})\n  screener scored: ${w.dim.score === null ? "N/A — could not assess" : `${w.dim.score}/4`}\n  screener's reasoning: ${w.dim.reasoning}\n  contradictions found: ${w.dim.contradictingEvidence.join(" | ") || "none"}\n  evidence found: ${w.dim.supportingEvidence.join(" | ") || "none"}`,
    )
    .join("\n");

  return {
    system: `You coach a job seeker on how to fix their résumé for ONE specific job, based on how an AI screener just scored them against that job's requirements. You speak directly to the candidate ("you", "your résumé"). Be direct, specific, and useful — no filler, no generic résumé tips.

HARD RULES — these override everything:
- NEVER advise inventing, inflating, or implying experience the candidate does not have. No "add Kubernetes production experience" unless the résumé already shows adjacent evidence to reframe.
- Three legitimate move types, label each fix with one:
  1. "rephrase" — the experience exists in their résumé but is phrased so the screener missed or under-scored it. Show how to surface it.
  2. "add-if-true" — the résumé is silent on something they may well have (e.g. work authorization, a metric, a tool used in a listed project). Tell them to add it ONLY if it is true, and say that explicitly.
  3. "gap" — the experience genuinely isn't there. Be honest: say what closing it actually takes (a project, a cert, addressing it in the cover letter/interview) — do not pretend wording fixes it.
- "exampleLine" is a résumé bullet REWRITE grounded strictly in evidence already present (for "rephrase") or a template with an explicit [only if true] placeholder (for "add-if-true"). For "gap" fixes, leave exampleLine an empty string.
- Address contradictions head-on: if the screener found a claim their history undercuts, the fix is to resolve the contradiction (correct the claim or add the missing substance), never to hide it.
- priority: "critical" for AUTO-FILTER RISK requirements and hard must-haves scored 0-1; "high" for other must-haves scored <= 2; "medium" for the rest.
- If formatting problems are listed (sections the parser could not read), the FIRST fix must address formatting — a résumé that machines can't parse loses before content is even scored. Use requirementId "formatting" for that one.
- 4 to 7 fixes total, ordered by priority. Output ONLY the JSON array. No prose, no code fences.

Output schema (array):
[
  {
    "requirementId": "string (as given, or 'formatting')",
    "priority": "critical | high | medium",
    "moveType": "rephrase | add-if-true | gap",
    "problem": "one blunt sentence: what the screener saw (or didn't)",
    "fix": "two or three sentences: exactly what to change and why it will re-score",
    "exampleLine": "rewritten résumé bullet, or template with [only if true], or empty string"
  }
]`,
    prompt: `Target role: ${clip(roleTitle, 120)}\n\nRequirements where the screener scored you weakest:\n${gapList}\n${
      unparsedSections.length
        ? `\nSections the résumé parser could NOT read (formatting problems):\n${unparsedSections
            .map((s) => `- ${clip(s, 200)}`)
            .join("\n")}`
        : ""
    }`,
  };
}

export interface CoachFix {
  requirementId: string;
  priority: "critical" | "high" | "medium";
  moveType: "rephrase" | "add-if-true" | "gap";
  problem: string;
  fix: string;
  exampleLine: string;
}

const PRIORITIES = new Set(["critical", "high", "medium"]);
const MOVES = new Set(["rephrase", "add-if-true", "gap"]);

export function sanitizeFixes(raw: unknown, validIds: Set<string>): CoachFix[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (f): f is Record<string, unknown> => typeof f === "object" && f !== null,
    )
    .map((f) => ({
      requirementId:
        typeof f.requirementId === "string" &&
        (validIds.has(f.requirementId) || f.requirementId === "formatting")
          ? f.requirementId
          : "",
      priority: (PRIORITIES.has(f.priority as string)
        ? f.priority
        : "medium") as CoachFix["priority"],
      moveType: (MOVES.has(f.moveType as string)
        ? f.moveType
        : "rephrase") as CoachFix["moveType"],
      problem: typeof f.problem === "string" ? f.problem.slice(0, 400) : "",
      fix: typeof f.fix === "string" ? f.fix.slice(0, 800) : "",
      exampleLine: typeof f.exampleLine === "string" ? f.exampleLine.slice(0, 400) : "",
    }))
    .filter((f) => f.requirementId && f.problem && f.fix)
    .slice(0, 7);
}
