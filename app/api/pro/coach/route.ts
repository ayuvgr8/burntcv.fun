import { NextResponse } from "next/server";
import { sanitizeDimensions } from "@/lib/hire/engine";
import { callHireJson } from "@/lib/hire/llm";
import { resolveProAccess } from "@/lib/pro/entitlements";
import { coachContract, sanitizeFixes, type WeakDim } from "@/lib/pro/prompts";
import { sanitizeRequirements } from "@/lib/pro/validate";
import { ipFrom, limitPublic, rateLimitedResponse } from "@/lib/ratelimit";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";

export const runtime = "nodejs";
export const maxDuration = 60;

// BurntCV Pro, stage 4 of 4 — turn the weakest dimensions into concrete,
// honest résumé fixes (rephrase / add-if-true / gap — never fabrication).
// Reuses the "questions" model slot: same stage of the Hire pipeline, opposite
// side of the table.
export async function POST(req: Request) {
  const ip = ipFrom(req);
  const burst = await limitPublic(ip, "pro");
  if (!burst.allowed) return rateLimitedResponse(burst.retryAfter);

  const len = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(len) && len > 256 * 1024) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;

  const requirements = sanitizeRequirements(d.requirements);
  const dimensions = sanitizeDimensions(d.dimensions, requirements);
  const roleTitle = typeof d.roleTitle === "string" ? d.roleTitle.slice(0, 120) : "this role";
  const unparsed = Array.isArray(d.unparsedSections)
    ? d.unparsedSections.filter((s): s is string => typeof s === "string").slice(0, 6)
    : [];
  if (requirements.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const byId = new Map(requirements.map((r) => [r.id, r]));
  const weak: WeakDim[] = dimensions
    .filter((x) => x.score === null || x.score <= 2 || x.contradictingEvidence.length > 0)
    .map((x) => ({ requirement: byId.get(x.requirementId)!, dim: x }))
    .filter((w) => !!w.requirement)
    .slice(0, 8);

  if (weak.length === 0 && unparsed.length === 0) {
    // Nothing meaningfully weak — a clean sweep needs no coaching call.
    return NextResponse.json({ fixes: [] });
  }

  // Paid chains (active pass / credits) bypass the free tier's budget cap.
  const paid = (
    await resolveProAccess(typeof d.proToken === "string" ? d.proToken : null)
  ).entitled;
  if (!paid && !(await budgetAvailable())) {
    return NextResponse.json({ error: "budget_exhausted" }, { status: 402 });
  }

  try {
    const { system, prompt } = coachContract(weak, roleTitle, unparsed);
    const res = await callHireJson<unknown>({
      stage: "questions", // same model slot as Hire's final stage
      system,
      prompt,
      maxTokens: 4000,
    });
    await recordSpend(res.model, res.usage);
    return NextResponse.json({
      fixes: sanitizeFixes(res.data, new Set(requirements.map((r) => r.id))),
    });
  } catch (err) {
    console.error("[pro:coach] failed:", err);
    return NextResponse.json({ error: "coach_failed" }, { status: 502 });
  }
}
