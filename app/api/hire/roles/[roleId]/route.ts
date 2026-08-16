import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import {
  appendAudit,
  deleteRole,
  getRole,
  listCandidates,
  saveRole,
} from "@/lib/hire/store";
import { parseJsonBody, vEnum } from "@/lib/validate";

export const runtime = "nodejs";

type Params = { params: Promise<{ roleId: string }> };

// GET /api/hire/roles/:roleId — role + its candidates (summaries).
export async function GET(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { roleId } = await params;
  const role = await getRole(ctx.account.id, roleId);
  if (!role) return jsonError(404, "not_found");
  const cands = await listCandidates(ctx.account.id, roleId);
  return NextResponse.json({
    role,
    candidates: cands.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      stage: c.stage,
      stageError: c.stageError,
      band: c.fitReport?.band ?? null,
      overallScore: c.fitReport?.overallScore ?? null,
      confidence: c.fitReport?.confidence ?? null,
      knockoutFailures: c.fitReport?.knockoutFailures?.length ?? 0,
      needsReview: c.fitReport?.needsReview ?? false,
      decision: c.decision,
      createdAt: c.createdAt,
      purgeAfter: c.purgeAfter,
    })),
  });
}

// PATCH /api/hire/roles/:roleId — open/close the role.
export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { roleId } = await params;
  const role = await getRole(ctx.account.id, roleId);
  if (!role) return jsonError(404, "not_found");

  const body = await parseJsonBody(req, {
    status: vEnum(["OPEN", "CLOSED"] as const),
  });
  if (!body.ok) return jsonError(body.status, body.error);

  role.status = body.value.status;
  await saveRole(role);
  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: role.status === "CLOSED" ? "role.closed" : "role.reopened",
    targetType: "role",
    targetId: role.id,
    meta: {},
  });
  return NextResponse.json({ ok: true, status: role.status });
}

// DELETE /api/hire/roles/:roleId — hard delete role + all its candidates.
export async function DELETE(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { roleId } = await params;
  const role = await getRole(ctx.account.id, roleId);
  if (!role) return jsonError(404, "not_found");
  const cands = await listCandidates(ctx.account.id, roleId);
  await deleteRole(ctx.account.id, roleId);
  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: "data.deleted",
    targetType: "role",
    targetId: roleId,
    meta: { title: role.title, candidatesDeleted: cands.length },
  });
  return NextResponse.json({ ok: true, candidatesDeleted: cands.length });
}
