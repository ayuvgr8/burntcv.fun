import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import { appendAudit, getCandidate } from "@/lib/hire/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ candId: string }> };

// GET /api/hire/candidates/:candId/export — DPDP access right (§15.2): the
// complete stored record for this candidate as a downloadable JSON document,
// so a data-subject access request can be answered in one click.
export async function GET(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { candId } = await params;
  const cand = await getCandidate(ctx.account.id, candId);
  if (!cand) return jsonError(404, "not_found");

  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: "data.exported",
    targetType: "candidate",
    targetId: candId,
    meta: { roleId: cand.roleId },
  });

  return new NextResponse(JSON.stringify(cand, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="burntcv-hire-candidate-${candId}.json"`,
      "cache-control": "no-store",
    },
  });
}
