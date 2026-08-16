// BurntCV Hire — prompt contracts for the evidence stage (PRD-Hire §8–10, §12).
//
// Hard rules baked into every contract:
//  - The model is NEVER asked for an overall score or a hiring recommendation.
//  - Every extracted fact / dimension score cites a verbatim résumé span.
//  - Missing data is null/empty, never fabricated. Absence of evidence = 0,
//    stated plainly — not inflated to "maybe", not treated as disqualifying.
//  - Output is the JSON schema only. No prose.

import type { Requirement, ResumeExtraction, DimensionScore } from "./types";

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

// ---- 1. JD decomposition (§8) — once per role, recruiter edits afterwards ----

export function decomposeContract(jdText: string): { system: string; prompt: string } {
  return {
    system: `You extract the hiring bar from a job description as discrete, testable requirements for a recruiter to review and re-weight. You are decision-support tooling: the recruiter defines what matters; you only propose structure.

Rules:
- MUST_HAVE = stated as required, or a hard constraint (years of experience, a specific skill, a certification, work authorization).
- PREFERRED = "nice to have", "bonus", "a plus".
- IMPLICIT = clearly needed by the role but unstated (e.g. communication for a customer-facing role). Flag these as IMPLICIT so the recruiter can accept or drop them.
- Never invent requirements the JD text does not support.
- 5 to 12 requirements total. Each label <= 8 words.
- suggestedWeight is 1..10 (10 = most important to this role).
- isKnockoutCandidate: true ONLY for objective, binary constraints (e.g. "valid work authorization", "5+ years required"). Subjective qualities are never knockouts.
- "detail" describes what good evidence for this requirement looks like on a résumé — it becomes the rating rubric later, so make it concrete.
- Output ONLY the JSON object below. No prose, no code fences.

Output schema:
{
  "roleTitle": "string",
  "seniority": "junior | mid | senior | lead | unknown",
  "requirements": [
    {
      "label": "string, <= 8 words",
      "category": "MUST_HAVE | PREFERRED | IMPLICIT",
      "suggestedWeight": 1,
      "isKnockoutCandidate": false,
      "detail": "what good evidence looks like",
      "rationale": "one line: why this was extracted from the JD"
    }
  ],
  "notes": "anything ambiguous the recruiter should clarify, or empty string"
}`,
    prompt: `Job description:\n\n${clip(jdText, 20000)}`,
  };
}

export interface DecomposeOut {
  roleTitle: string;
  seniority: string;
  requirements: {
    label: string;
    category: string;
    suggestedWeight: number;
    isKnockoutCandidate: boolean;
    detail: string;
    rationale: string;
  }[];
  notes: string;
}

// ---- 2. résumé extraction (§9) — neutral structuring, evidence-mandatory ----

export function extractContract(resumeText: string): { system: string; prompt: string } {
  return {
    system: `You convert a résumé into a normalized structure with provenance. You are a neutral parser: extract only what is present, never infer a skill the résumé does not state, never evaluate or score.

Rules:
- Every atomic fact carries an "evidence" span quoting the résumé verbatim. No evidence, no fact.
- Missing data is null or an empty array — never fabricated.
- Per-item "confidence" 0..1. Anything ambiguous (non-standard layout, unclear dates) gets lower confidence AND its raw text added to "unparsedSections".
- "extractionConfidence" is your overall 0..1 confidence that this résumé parsed cleanly.
- Do not evaluate fit. Extraction is neutral structuring only.
- Output ONLY the JSON object below. No prose, no code fences.

Output schema:
{
  "candidateName": "string | null",
  "totalYearsExperience": 0.0,
  "skills": [{ "name": "string", "lastUsedYear": 2025, "yearsUsed": 3.0, "evidence": "verbatim résumé line", "confidence": 0.9 }],
  "roles": [{ "title": "string", "org": "string", "start": "YYYY-MM or null", "end": "YYYY-MM or present or null", "durationMonths": 0, "highlights": ["verbatim line"], "evidence": "source span" }],
  "education": [{ "degree": "string", "field": "string", "institution": "string", "year": 2020, "evidence": "span" }],
  "certifications": [{ "name": "string", "year": 2021, "evidence": "span" }],
  "workAuthSignals": ["verbatim mention if present"],
  "extractionConfidence": 0.85,
  "unparsedSections": ["text you could not confidently structure"]
}`,
    prompt: `Résumé text:\n\n${clip(resumeText, 24000)}`,
  };
}

// ---- 3. per-requirement rating (§10) — one dimension at a time, evidence-cited ----

export function rateContract(
  requirements: Requirement[],
  extraction: ResumeExtraction,
  resumeText: string,
): { system: string; prompt: string } {
  const reqList = requirements
    .map(
      (r) =>
        `- id: ${r.id}\n  requirement: ${r.label} (${r.category})\n  what good evidence looks like: ${r.detail || "direct, recent, sustained evidence of this requirement"}`,
    )
    .join("\n");

  return {
    system: `You rate how well a résumé evidences EACH job requirement, one dimension at a time, against a fixed rubric. You never produce an overall score, never rank, never recommend hiring — that is deterministic code's job, applied with the recruiter's own weights.

The 0–4 rubric (fixed):
- 4 Strong: direct, recent, sustained evidence clearly meets/exceeds the requirement.
- 3 Adequate: evidence meets the requirement but is dated, brief, or partial.
- 2 Partial: adjacent/transferable evidence; requirement not directly met.
- 1 Weak: minimal or tangential signal.
- 0 Absent: no supporting evidence in the résumé.
- null (N/A): the résumé is too unparseable to assess THIS dimension.

Rules:
- Rate each requirement independently on its own line with its own evidence. Never blend dimensions.
- supportingEvidence entries are verbatim spans from the résumé. Any score >= 1 MUST cite at least one span — a score >= 1 with no evidence is invalid output.
- Actively look for contradictingEvidence (e.g. claims "expert" but tenure shows 6 months).
- Absence of evidence is score 0, stated plainly — never inflated to "maybe", never treated as more than what it is.
- "reasoning": one or two sentences tying the evidence to the rubric level.
- "confidence" 0..1 for each rating.
- Output ONLY a JSON array of dimension objects, one per requirement id given, in the same order. No prose, no code fences.

Output schema (array):
[
  {
    "requirementId": "string (exactly as given)",
    "score": 3,
    "supportingEvidence": ["verbatim résumé span"],
    "contradictingEvidence": [],
    "reasoning": "one or two sentences",
    "confidence": 0.8
  }
]`,
    prompt: `Requirements to rate (each independently):\n${reqList}\n\nStructured extraction of the résumé (with evidence provenance):\n${clip(JSON.stringify(extraction), 12000)}\n\nOriginal résumé text (source of truth for verbatim spans):\n\n${clip(resumeText, 16000)}`,
  };
}

export type RateOut = DimensionScore[];

// ---- 4. interview questions (§12) — target the gaps and contradictions ----

export function questionsContract(
  weakDims: { requirement: Requirement; dim: DimensionScore }[],
  roleTitle: string,
): { system: string; prompt: string } {
  const gapList = weakDims
    .map(
      (w) =>
        `- requirementId: ${w.requirement.id}\n  requirement: ${w.requirement.label}\n  score: ${w.dim.score === null ? "N/A" : w.dim.score}/4\n  reasoning: ${w.dim.reasoning}\n  contradictions: ${w.dim.contradictingEvidence.join(" | ") || "none"}`,
    )
    .join("\n");

  return {
    system: `You write interview questions that help a human recruiter probe the SPECIFIC gaps and contradictions found when screening a résumé. These are decision-support: they let the candidate prove or disprove a gap — they never pre-judge.

Rules:
- 3 to 5 questions total. Each ties to one given requirementId.
- Target the gap or contradiction directly (e.g. "You listed Kubernetes but I don't see production usage — walk me through the last cluster you operated and what broke"). No generic trivia.
- "whatGoodLooksLike": the concrete signals in an answer that would close the gap.
- "whatWeakLooksLike": the signals that would confirm it.
- Output ONLY a JSON array. No prose, no code fences.

Output schema (array):
[
  { "requirementId": "string", "question": "string", "whatGoodLooksLike": "string", "whatWeakLooksLike": "string" }
]`,
    prompt: `Role: ${clip(roleTitle, 120)}\n\nGaps and contradictions to probe:\n${gapList}`,
  };
}

export interface QuestionOut {
  requirementId: string;
  question: string;
  whatGoodLooksLike: string;
  whatWeakLooksLike: string;
}
