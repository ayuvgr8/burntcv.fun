import { NextResponse } from "next/server";
import { aggregate, ENGINE_VERSION, sanitizeDimensions } from "@/lib/hire/engine";
import { HIRE_LIMITS } from "@/lib/hire/config";
import { callHireJson } from "@/lib/hire/llm";
import { rateContract } from "@/lib/hire/prompts";
import { resolveProAccess } from "@/lib/pro/entitlements";
import {
  sanitizeRequirements,
  sanitizeRoundTrippedExtraction,
} from "@/lib/pro/validate";
import { ipFrom, limitPublic, rateLimitedResponse } from "@/lib/ratelimit";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";

export const runtime = "nodejs";
export const maxDuration = 60;

// BurntCV Pro, stage 3 of 4 — rate every requirement against the résumé's
// evidence, then compute the verdict with the SAME deterministic engine that
// powers Hire (weighted mean, N/A excluded, knockouts flagged). The verdict is
// computed server-side so the score the candidate sees is exactly the score
// the engine produces — same input, same number, either product.
export async function POST(req: Request) {
  const ip = ipFrom(req);
  const burst = await limitPublic(ip, "pro");
  if (!burst.allowed) return rateLimitedResponse(burst.retryAfter);

  const len = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(len) && len > 384 * 1024) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;

  // Client-round-tripped intermediates — re-sanitized before anything runs.
  const requirements = sanitizeRequirements(d.requirements);
  const extraction = sanitizeRoundTrippedExtraction(d.extraction);
  const resumeText =
    typeof d.resumeText === "string"
      ? d.resumeText.slice(0, HIRE_LIMITS.maxResumeChars)
      : "";
  if (requirements.length === 0 || resumeText.length < 120) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Paid chains (active pass / credits) bypass the free tier's budget cap.
  const paid = (
    await resolveProAccess(typeof d.proToken === "string" ? d.proToken : null)
  ).entitled;
  if (!paid && !(await budgetAvailable())) {
    return NextResponse.json({ error: "budget_exhausted" }, { status: 402 });
  }

  try {
    const { system, prompt } = rateContract(requirements, extraction, resumeText);
    const res = await callHireJson<unknown>({
      stage: "rate",
      system,
      prompt,
      maxTokens: 8000,
    });
    await recordSpend(res.model, res.usage);

    const dimensions = sanitizeDimensions(res.data, requirements);
    const verdict = aggregate(dimensions, requirements, extraction.extractionConfidence);
    return NextResponse.json({
      dimensions,
      verdict,
      engineVersion: ENGINE_VERSION,
    });
  } catch (err) {
    console.error("[pro:rate] failed:", err);
    return NextResponse.json({ error: "rate_failed" }, { status: 502 });
  }
}
