// BurntCV Hire — STAGE B: the deterministic verdict (PRD-Hire §11).
//
// Pure functions only. No LLM, no I/O, no Date.now(), no imports beyond types.
// Same inputs → same verdict, always — that is the reproducibility guarantee
// the whole product stands on, and why this file (not a model) applies the
// recruiter's weights. Thresholds are versioned WITH the engine so an old
// FitReport's logic is reconstructable from its engineVersion string.
//
// Rules baked in:
//  - N/A dimensions are EXCLUDED from the mean, not scored 0 (missing evidence
//    ≠ failing a criterion the résumé didn't address).
//  - A score >= 1 with no supporting evidence is invalid LLM output → sanitized
//    to N/A with zero confidence (routes toward human review, never a guess).
//  - Knockout failures are SURFACED, never actioned. Nothing here writes a
//    decision; only a recruiter does.

import type { DimensionScore, FitBand, Gap, Requirement } from "./types";

export const ENGINE_VERSION = "hire-engine/1.0.0";

// Band thresholds (0..100 overall) and the confidence floor below which the
// verdict is "we don't know enough" rather than a band. Tuned post-pilot.
export const THRESHOLDS = {
  strong: 75,
  possible: 50,
  minConfidence: 0.5,
  // A dimension "counts as confidently scored" at or above this.
  dimConfidenceFloor: 0.6,
  // Knockout fails when its dimension scores at or below this.
  knockoutFailAt: 1,
} as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Normalize raw LLM ratings into trustworthy inputs. Enforces the evidence
// rule and clamps every numeric field; anything malformed becomes N/A instead
// of a fabricated number.
export function sanitizeDimensions(
  raw: unknown,
  requirements: Requirement[],
): DimensionScore[] {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const out: DimensionScore[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue;
      const d = item as Record<string, unknown>;
      const reqId = typeof d.requirementId === "string" ? d.requirementId : "";
      if (!byId.has(reqId) || seen.has(reqId)) continue;
      seen.add(reqId);

      const support = Array.isArray(d.supportingEvidence)
        ? d.supportingEvidence.filter((e): e is string => typeof e === "string" && !!e.trim())
        : [];
      const contra = Array.isArray(d.contradictingEvidence)
        ? d.contradictingEvidence.filter((e): e is string => typeof e === "string" && !!e.trim())
        : [];

      let score: number | null =
        typeof d.score === "number" && Number.isFinite(d.score)
          ? Math.min(4, Math.max(0, Math.round(d.score)))
          : null;
      let confidence = typeof d.confidence === "number" ? clamp01(d.confidence) : 0.5;
      let reasoning = typeof d.reasoning === "string" ? d.reasoning : "";

      // The evidence rule: score >= 1 with no cited span is invalid output.
      if (score !== null && score >= 1 && support.length === 0) {
        score = null;
        confidence = 0;
        reasoning = `[invalid rating discarded: score given without cited evidence] ${reasoning}`.trim();
      }

      out.push({
        requirementId: reqId,
        score,
        supportingEvidence: support,
        contradictingEvidence: contra,
        reasoning,
        confidence,
      });
    }
  }

  // Any requirement the model skipped is N/A — surfaced, never silently dropped.
  for (const r of requirements) {
    if (!seen.has(r.id)) {
      out.push({
        requirementId: r.id,
        score: null,
        supportingEvidence: [],
        contradictingEvidence: [],
        reasoning: "Not assessed by the rating stage.",
        confidence: 0,
      });
    }
  }
  return out;
}

export interface Verdict {
  overallScore: number; // 0..100
  band: FitBand;
  knockoutFailures: string[]; // requirementIds
  confidence: number; // 0..1
  needsReview: boolean;
  gaps: Gap[];
}

// The verdict: recruiter weights × rubric scores, via explicit math.
export function aggregate(
  dimensions: DimensionScore[],
  requirements: Requirement[],
  extractionConfidence: number,
): Verdict {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  const scored = dimensions.filter(
    (d) => d.score !== null && byId.has(d.requirementId),
  );

  // 1–2. Weighted mean over scored dimensions, each normalized to 0..1.
  const totalWeight = scored.reduce(
    (sum, d) => sum + (byId.get(d.requirementId)?.weight ?? 1),
    0,
  );
  const overall01 =
    totalWeight > 0
      ? scored.reduce(
          (sum, d) =>
            sum + ((d.score as number) / 4) * (byId.get(d.requirementId)?.weight ?? 1),
          0,
        ) / totalWeight
      : 0;
  const overallScore = Math.round(overall01 * 100);

  // 3. Knockouts — only recruiter-confirmed ones, and only ever a flag.
  const knockoutFailures = scored
    .filter(
      (d) =>
        byId.get(d.requirementId)?.isKnockout &&
        (d.score as number) <= THRESHOLDS.knockoutFailAt,
    )
    .map((d) => d.requirementId);

  // 4. Confidence: extraction confidence × fraction of dimensions rated with
  // decent confidence. Both must be healthy for the verdict to be trusted.
  const confidentDims = dimensions.filter(
    (d) => d.score !== null && d.confidence >= THRESHOLDS.dimConfidenceFloor,
  ).length;
  const dimCoverage = dimensions.length > 0 ? confidentDims / dimensions.length : 0;
  const confidence = clamp01(
    Math.sqrt(clamp01(extractionConfidence) * dimCoverage),
  );

  // 5. Band assignment.
  let band: FitBand;
  if (confidence < THRESHOLDS.minConfidence || scored.length === 0) {
    band = "INSUFFICIENT_EVIDENCE";
  } else if (knockoutFailures.length > 0) {
    band = "WEAK"; // flagged prominently; the human still decides
  } else if (overallScore >= THRESHOLDS.strong) {
    band = "STRONG";
  } else if (overallScore >= THRESHOLDS.possible) {
    band = "POSSIBLE";
  } else {
    band = "WEAK";
  }

  return {
    overallScore,
    band,
    knockoutFailures,
    confidence: Math.round(confidence * 100) / 100,
    needsReview: band === "INSUFFICIENT_EVIDENCE",
    gaps: deriveGaps(dimensions, requirements),
  };
}

// Gaps: every requirement scoring <= 2 (or unassessable), worst first,
// weighted by how much the recruiter said it matters.
export function deriveGaps(
  dimensions: DimensionScore[],
  requirements: Requirement[],
): Gap[] {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  return dimensions
    .filter((d) => byId.has(d.requirementId) && (d.score === null || d.score <= 2))
    .sort((a, b) => {
      const wa = byId.get(a.requirementId)?.weight ?? 1;
      const wb = byId.get(b.requirementId)?.weight ?? 1;
      const sa = a.score === null ? -1 : a.score;
      const sb = b.score === null ? -1 : b.score;
      return sa - sb || wb - wa;
    })
    .map((d) => {
      const req = byId.get(d.requirementId)!;
      const missing = d.score === null || d.score <= 1;
      return {
        requirementId: d.requirementId,
        label: req.label,
        severity: missing ? ("missing" as const) : ("partial" as const),
        note:
          d.score === null
            ? "Could not be assessed from this résumé — probe directly."
            : d.reasoning,
      };
    });
}
