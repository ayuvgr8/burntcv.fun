import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import { HIRE_LIMITS } from "@/lib/hire/config";
import { callHireJson } from "@/lib/hire/llm";
import { decomposeContract, type DecomposeOut } from "@/lib/hire/prompts";
import { appendAudit, listCandidates, listRoles, newId, saveRole } from "@/lib/hire/store";
import type { ReqCategory, Requirement, Role } from "@/lib/hire/types";
import { limitUser } from "@/lib/ratelimit";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const CATEGORIES = new Set<string>(["MUST_HAVE", "PREFERRED", "IMPLICIT"]);

// GET /api/hire/roles — the recruiter's roles with candidate counts.
export async function GET(req: Request) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const roles = await listRoles(ctx.account.id);
  const out = [];
  for (const r of roles) {
    const cands = await listCandidates(ctx.account.id, r.id);
    out.push({
      id: r.id,
      title: r.title,
      status: r.status,
      confirmed: r.confirmed,
      requirementCount: r.requirements.length,
      candidateCount: cands.length,
      createdAt: r.createdAt,
    });
  }
  return NextResponse.json({ roles: out });
}

// POST /api/hire/roles — paste a JD, get back a role with DRAFT weighted
// requirements. The draft is not scoreable until the recruiter confirms the
// bar (PRD-Hire §8.3): knockouts start false, `confirmed` starts false.
export async function POST(req: Request) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;

  const gate = await limitUser(ctx.account.id, "hire-llm");
  if (!gate.allowed) return jsonError(429, "rate_limited", { retryAfter: gate.retryAfter });

  const body = await parseJsonBody(
    req,
    {
      title: vString({ max: 120, optional: true }),
      jdText: vString({ min: 80, max: HIRE_LIMITS.maxJdChars }),
    },
    { maxBytes: 128 * 1024 },
  );
  if (!body.ok) return jsonError(body.status, body.error);

  const existing = await listRoles(ctx.account.id);
  if (existing.length >= HIRE_LIMITS.maxRolesPerAccount) {
    return jsonError(403, "role_limit_reached", { limit: HIRE_LIMITS.maxRolesPerAccount });
  }

  let decomposed: DecomposeOut;
  let model: string;
  try {
    const { system, prompt } = decomposeContract(body.value.jdText);
    const res = await callHireJson<DecomposeOut>({ stage: "decompose", system, prompt, maxTokens: 6000 });
    decomposed = res.data;
    model = res.model;
  } catch (err) {
    console.error("[hire:roles] decomposition failed:", err);
    return jsonError(502, "decomposition_failed");
  }

  const requirements: Requirement[] = (decomposed.requirements ?? [])
    .filter((r) => r && typeof r.label === "string" && r.label.trim())
    .slice(0, 15)
    .map((r, i) => ({
      id: newId("req"),
      label: r.label.trim().slice(0, 120),
      category: (CATEGORIES.has(r.category) ? r.category : "PREFERRED") as ReqCategory,
      weight: Math.min(10, Math.max(1, Math.round(Number(r.suggestedWeight) || 5))),
      isKnockout: false, // only the recruiter's confirm call can set this
      knockoutSuggested: !!r.isKnockoutCandidate,
      detail: typeof r.detail === "string" ? r.detail.slice(0, 600) : "",
      rationale: typeof r.rationale === "string" ? r.rationale.slice(0, 300) : "",
      source: "AI",
      orderIndex: i,
    }));

  if (requirements.length === 0) return jsonError(502, "decomposition_empty");

  const role: Role = {
    id: newId("role"),
    accountId: ctx.account.id,
    title: (body.value.title || decomposed.roleTitle || "Untitled role").slice(0, 120),
    jdRawText: body.value.jdText,
    seniority: typeof decomposed.seniority === "string" ? decomposed.seniority : "unknown",
    decompositionNotes: typeof decomposed.notes === "string" ? decomposed.notes.slice(0, 1000) : "",
    requirements,
    confirmed: false,
    status: "OPEN",
    createdBy: ctx.session.email,
    createdAt: Date.now(),
  };
  await saveRole(role);
  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: "role.created",
    targetType: "role",
    targetId: role.id,
    meta: { title: role.title, requirements: requirements.length, model },
  });

  return NextResponse.json({ role });
}
