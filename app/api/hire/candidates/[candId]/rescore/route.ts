import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import { appendAudit, getCandidate, getRole, saveCandidate } from "@/lib/hire/store";
import { limitUser } from "@/lib/ratelimit";

export const runtime = "nodejs";

type Params = { params: Promise<{ candId: string }> };

// POST /api/hire/candidates/:candId/rescore — re-run rating + verdict after
// the recruiter edited the confirmed bar. The stored extraction is reused
// (the résumé didn't change — the weights did), so this costs one rating pass,
// not a full pipeline. The client drives /process to completion as usual.
export async function POST(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;

  const gate = await limitUser(ctx.account.id, "hire-llm");
  if (!gate.allowed) return jsonError(429, "rate_limited", { retryAfter: gate.retryAfter });

  const { candId } = await params;
  const cand = await getCandidate(ctx.account.id, candId);
  if (!cand) return jsonError(404, "not_found");
  const role = await getRole(ctx.account.id, cand.roleId);
  if (!role) return jsonError(404, "role_gone");
  if (!role.confirmed) return jsonError(409, "requirements_not_confirmed");

  // Reuse the extraction when we have one; otherwise restart from the top.
  cand.stage = cand.extraction ? "extracted" : "new";
  cand.stageError = null;
  cand.ratings = null;
  cand.fitReport = null;
  // The human's recorded decision stands — it's their call, logged with their
  // name; the fresh report simply gives them grounds to revisit it.
  await saveCandidate(cand);
  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: "candidate.rescore_requested",
    targetType: "candidate",
    targetId: cand.id,
    meta: { roleId: role.id, barVersion: role.barVersion ?? 1 },
  });

  return NextResponse.json({ ok: true, stage: cand.stage });
}
