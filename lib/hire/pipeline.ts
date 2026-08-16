// BurntCV Hire — the screening pipeline, one stage per call.
//
// PRD-Hire §14 describes this as an async job chain; for v0's 1–5 candidates
// per role we get the same resilience without queue infrastructure by letting
// the client drive: POST /process advances exactly one stage (each safely
// inside a serverless timeout), is idempotent per stage, and any failure
// routes the candidate to human review — never a silent drop, never a guess.
//
//   new ──extract──▶ extracted ──rate──▶ rated ──verdict+questions──▶ scored
//                       │                  │
//                       └──── failure ─────┴────▶ review (stageError set)

import { aggregate, ENGINE_VERSION, sanitizeDimensions } from "./engine";
import { sanitizeExtraction } from "./extraction";
import { callHireJson } from "./llm";
import {
  extractContract,
  questionsContract,
  rateContract,
  type QuestionOut,
} from "./prompts";
import { appendAudit, saveCandidate } from "./store";
import type {
  Candidate,
  DimensionScore,
  InterviewQuestion,
  ResumeExtraction,
  Role,
} from "./types";

function sanitizeQuestions(raw: unknown, validIds: Set<string>): InterviewQuestion[] {
  if (!Array.isArray(raw)) return [];
  return (raw as QuestionOut[])
    .filter(
      (q) =>
        typeof q === "object" &&
        q !== null &&
        typeof q.question === "string" &&
        q.question.trim() &&
        typeof q.requirementId === "string" &&
        validIds.has(q.requirementId),
    )
    .slice(0, 5)
    .map((q) => ({
      requirementId: q.requirementId,
      question: q.question.trim(),
      whatGoodLooksLike: typeof q.whatGoodLooksLike === "string" ? q.whatGoodLooksLike : "",
      whatWeakLooksLike: typeof q.whatWeakLooksLike === "string" ? q.whatWeakLooksLike : "",
    }));
}

export interface AdvanceResult {
  candidate: Candidate;
  done: boolean;
}

// Advance one stage. Persists the candidate (and audit trail) itself.
export async function advanceCandidate(role: Role, cand: Candidate): Promise<AdvanceResult> {
  if (cand.stage === "scored" || cand.stage === "review") {
    return { candidate: cand, done: true };
  }

  try {
    if (cand.stage === "new") {
      const { system, prompt } = extractContract(cand.resumeText);
      const res = await callHireJson<unknown>({ stage: "extract", system, prompt, maxTokens: 8000 });
      cand.extraction = sanitizeExtraction(res.data);
      cand.modelVersions.extract = res.model;
      cand.stage = "extracted";
    } else if (cand.stage === "extracted") {
      const { system, prompt } = rateContract(
        role.requirements,
        cand.extraction as ResumeExtraction,
        cand.resumeText,
      );
      const res = await callHireJson<unknown>({ stage: "rate", system, prompt, maxTokens: 8000 });
      cand.ratings = sanitizeDimensions(res.data, role.requirements);
      cand.modelVersions.rate = res.model;
      cand.stage = "rated";
    } else if (cand.stage === "rated") {
      const dims = cand.ratings as DimensionScore[];
      const extraction = cand.extraction as ResumeExtraction;
      // STAGE B — the verdict is pure code (engine.ts), applied here.
      const verdict = aggregate(dims, role.requirements, extraction.extractionConfidence);

      // Interview questions target the gaps + contradictions. Best-effort:
      // a question-generation hiccup must not sink an otherwise-good report.
      let questions: InterviewQuestion[] = [];
      const weak = dims
        .map((d) => ({
          requirement: role.requirements.find((r) => r.id === d.requirementId)!,
          dim: d,
        }))
        .filter(
          (w) =>
            w.requirement &&
            (w.dim.score === null || w.dim.score <= 2 || w.dim.contradictingEvidence.length > 0),
        )
        .slice(0, 6);
      if (weak.length > 0) {
        try {
          const { system, prompt } = questionsContract(weak, role.title);
          const res = await callHireJson<unknown>({ stage: "questions", system, prompt, maxTokens: 3000 });
          questions = sanitizeQuestions(res.data, new Set(role.requirements.map((r) => r.id)));
          cand.modelVersions.questions = res.model;
        } catch (err) {
          console.warn("[hire:pipeline] question generation failed (non-fatal):", err);
        }
      }

      cand.barVersion = role.barVersion ?? 1;
      cand.fitReport = {
        overallScore: verdict.overallScore,
        band: verdict.band,
        dimensionScores: dims,
        gaps: verdict.gaps,
        interviewQuestions: questions,
        knockoutFailures: verdict.knockoutFailures,
        needsReview: verdict.needsReview,
        confidence: verdict.confidence,
        engineVersion: ENGINE_VERSION,
        modelVersions: { ...cand.modelVersions },
        createdAt: Date.now(),
      };
      cand.stage = "scored";
      await appendAudit(cand.accountId, {
        actor: null,
        action: "candidate.scored",
        targetType: "candidate",
        targetId: cand.id,
        meta: {
          roleId: role.id,
          band: verdict.band,
          overallScore: verdict.overallScore,
          confidence: verdict.confidence,
          knockoutFailures: verdict.knockoutFailures.length,
          engineVersion: ENGINE_VERSION,
        },
      });
    }
  } catch (err) {
    // Any stage failing (after llm.ts's internal retry) → human review, loudly.
    const code = err instanceof Error ? err.message : "pipeline_failed";
    console.error(`[hire:pipeline] candidate ${cand.id} stage ${cand.stage} failed:`, err);
    cand.stage = "review";
    cand.stageError = code;
    await appendAudit(cand.accountId, {
      actor: null,
      action: "candidate.review_required",
      targetType: "candidate",
      targetId: cand.id,
      meta: { roleId: role.id, error: code },
    });
  }

  await saveCandidate(cand);
  return { candidate: cand, done: cand.stage === "scored" || cand.stage === "review" };
}
