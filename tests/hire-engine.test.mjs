// BurntCV Hire — deterministic engine tests (PRD-Hire M3 acceptance).
// Run: npm run test:hire   (Node 23+ type-strips the .ts import natively)
//
// The properties under test are the product's legal spine:
//   same input → same verdict; evidence-less scores die; N/A ≠ zero;
//   knockouts flag but never decide; low confidence → insufficient evidence.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregate,
  deriveGaps,
  sanitizeDimensions,
  ENGINE_VERSION,
  THRESHOLDS,
} from "../lib/hire/engine.ts";

const req = (id, weight, opts = {}) => ({
  id,
  label: opts.label ?? id,
  category: opts.category ?? "MUST_HAVE",
  weight,
  isKnockout: opts.isKnockout ?? false,
  knockoutSuggested: false,
  detail: "",
  rationale: "",
  source: "AI",
  orderIndex: 0,
});

const dim = (requirementId, score, opts = {}) => ({
  requirementId,
  score,
  supportingEvidence: opts.evidence ?? (score !== null && score >= 1 ? ["quoted span"] : []),
  contradictingEvidence: opts.contra ?? [],
  reasoning: "r",
  confidence: opts.confidence ?? 0.9,
});

test("reproducibility: same input → identical verdict", () => {
  const reqs = [req("a", 9), req("b", 5), req("c", 2)];
  const dims = [dim("a", 4), dim("b", 2), dim("c", 0)];
  const v1 = aggregate(dims, reqs, 0.9);
  const v2 = aggregate(dims, reqs, 0.9);
  assert.deepEqual(v1, v2);
});

test("weighted mean matches hand math and honors recruiter weights", () => {
  // a: 4/4 * w8 = 8.0 ; b: 2/4 * w2 = 1.0 → 9/10 → 90
  const reqs = [req("a", 8), req("b", 2)];
  const v = aggregate([dim("a", 4), dim("b", 2)], reqs, 1);
  assert.equal(v.overallScore, 90);
  assert.equal(v.band, "STRONG");
  // Flip the weights → 4/4*2 + 2/4*8 = 6/10 → 60 → POSSIBLE, not STRONG.
  const flipped = aggregate([dim("a", 4), dim("b", 2)], [req("a", 2), req("b", 8)], 1);
  assert.equal(flipped.overallScore, 60);
  assert.equal(flipped.band, "POSSIBLE");
});

test("N/A dimensions are excluded from the mean, not zeroed", () => {
  const reqs = [req("a", 5), req("b", 5)];
  const withNA = aggregate([dim("a", 4), dim("b", null)], reqs, 1);
  assert.equal(withNA.overallScore, 100); // b excluded entirely
  const withZero = aggregate([dim("a", 4), dim("b", 0)], reqs, 1);
  assert.equal(withZero.overallScore, 50); // an actual 0 counts
});

test("evidence rule: score >= 1 with no cited span is sanitized to N/A", () => {
  const reqs = [req("a", 5)];
  const dims = sanitizeDimensions(
    [{ requirementId: "a", score: 3, supportingEvidence: [], contradictingEvidence: [], reasoning: "", confidence: 0.9 }],
    reqs,
  );
  assert.equal(dims[0].score, null);
  assert.equal(dims[0].confidence, 0);
  // A legit 0 with no evidence is fine — absence of evidence IS the finding.
  const zero = sanitizeDimensions(
    [{ requirementId: "a", score: 0, supportingEvidence: [], contradictingEvidence: [], reasoning: "", confidence: 0.9 }],
    reqs,
  );
  assert.equal(zero[0].score, 0);
});

test("knockout failure flags and caps the band — but produces no decision", () => {
  const reqs = [req("auth", 10, { isKnockout: true }), req("b", 5)];
  const v = aggregate([dim("auth", 0), dim("b", 4)], reqs, 1);
  assert.deepEqual(v.knockoutFailures, ["auth"]);
  assert.equal(v.band, "WEAK"); // flagged, not auto-rejected
  assert.equal("decision" in v, false); // the engine cannot decide, structurally
  // Same scores, knockout unconfirmed → no flag.
  const v2 = aggregate([dim("auth", 0), dim("b", 4)], [req("auth", 10), req("b", 5)], 1);
  assert.deepEqual(v2.knockoutFailures, []);
});

test("low confidence → INSUFFICIENT_EVIDENCE, routed to human review", () => {
  const reqs = [req("a", 5), req("b", 5)];
  const v = aggregate([dim("a", 4, { confidence: 0.2 }), dim("b", 3, { confidence: 0.3 })], reqs, 0.4);
  assert.equal(v.band, "INSUFFICIENT_EVIDENCE");
  assert.equal(v.needsReview, true);
});

test("band thresholds sit exactly at the configured edges", () => {
  const reqs = [req("a", 1)];
  assert.equal(aggregate([dim("a", 3)], reqs, 1).overallScore, THRESHOLDS.strong);
  assert.equal(aggregate([dim("a", 3)], reqs, 1).band, "STRONG"); // 75 inclusive
  assert.equal(aggregate([dim("a", 2)], reqs, 1).band, "POSSIBLE"); // 50 inclusive
  assert.equal(aggregate([dim("a", 1)], reqs, 1).band, "WEAK");
});

test("skipped requirements are backfilled as N/A, never silently dropped", () => {
  const reqs = [req("a", 5), req("b", 5)];
  const dims = sanitizeDimensions([dim("a", 4)], reqs);
  assert.equal(dims.length, 2);
  const b = dims.find((d) => d.requirementId === "b");
  assert.equal(b.score, null);
  assert.equal(b.confidence, 0);
});

test("gaps: worst-and-heaviest first, N/A marked unassessable", () => {
  const reqs = [req("a", 9, { label: "K8s" }), req("b", 3, { label: "Docs" }), req("c", 5, { label: "SQL" })];
  const gaps = deriveGaps([dim("a", 0), dim("b", 2), dim("c", null)], reqs);
  assert.equal(gaps.length, 3);
  assert.equal(gaps[0].requirementId, "c"); // null sorts worst
  assert.equal(gaps[0].severity, "missing");
  assert.equal(gaps[1].requirementId, "a");
  assert.equal(gaps[2].severity, "partial");
});

test("engine version is pinned for auditability", () => {
  assert.match(ENGINE_VERSION, /^hire-engine\/\d+\.\d+\.\d+$/);
});
