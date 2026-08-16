import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import {
  appendAudit,
  deleteCandidate,
  getCandidate,
  getRole,
} from "@/lib/hire/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ candId: string }> };

// GET /api/hire/candidates/:candId — full record: extraction, fit report,
// decision. (The résumé text itself is returned too — it is the recruiter's
// tenant data and the evidence spans need their source.)
export async function GET(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { candId } = await params;
  const cand = await getCandidate(ctx.account.id, candId);
  if (!cand) return jsonError(404, "not_found");
  const role = await getRole(ctx.account.id, cand.roleId);
  return NextResponse.json({ candidate: cand, role: role ? { id: role.id, title: role.title, requirements: role.requirements } : null });
}

// DELETE /api/hire/candidates/:candId — DPDP erasure: hard delete now,
// recorded in the audit trail (deletions are logged, not silent).
export async function DELETE(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { candId } = await params;
  const cand = await getCandidate(ctx.account.id, candId);
  if (!cand) return jsonError(404, "not_found");
  await deleteCandidate(ctx.account.id, cand);
  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: "data.deleted",
    targetType: "candidate",
    targetId: candId,
    meta: { roleId: cand.roleId },
  });
  return NextResponse.json({ ok: true });
}
