import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import { appendAudit, getCandidate, saveCandidate } from "@/lib/hire/store";
import { parseJsonBody, vEnum, vString } from "@/lib/validate";

export const runtime = "nodejs";

type Params = { params: Promise<{ candId: string }> };

// POST /api/hire/candidates/:candId/decision — the accountable human action
// (PRD-Hire §15.1). This is the ONLY code path that records an outcome, and it
// cannot run without a verified recruiter session: decidedBy is always a named
// human. The system itself never advances or rejects anyone.
export async function POST(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { candId } = await params;
  const cand = await getCandidate(ctx.account.id, candId);
  if (!cand) return jsonError(404, "not_found");

  const body = await parseJsonBody(req, {
    outcome: vEnum(["ADVANCE", "HOLD", "PASS"] as const),
    note: vString({ max: 2000, optional: true }),
  });
  if (!body.ok) return jsonError(body.status, body.error);

  cand.decision = {
    outcome: body.value.outcome,
    note: body.value.note ?? "",
    decidedBy: ctx.session.email,
    decidedAt: Date.now(),
  };
  await saveCandidate(cand);
  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: "candidate.decided",
    targetType: "candidate",
    targetId: cand.id,
    meta: {
      roleId: cand.roleId,
      outcome: body.value.outcome,
      band: cand.fitReport?.band ?? null,
      overallScore: cand.fitReport?.overallScore ?? null,
    },
  });
  return NextResponse.json({ ok: true, decision: cand.decision });
}
