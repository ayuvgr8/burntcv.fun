import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import { clampRetentionDays, HIRE_LIMITS } from "@/lib/hire/config";
import { deleteAllAccountData, saveAccount, screensUsed } from "@/lib/hire/store";

export const runtime = "nodejs";

// GET /api/hire/account — profile + usage.
export async function GET(req: Request) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  return NextResponse.json({
    account: {
      orgName: ctx.account.orgName,
      email: ctx.account.ownerEmail,
      retentionDays: ctx.account.retentionDays,
      createdAt: ctx.account.createdAt,
    },
    usage: { screensUsed: await screensUsed(ctx.account.id), limits: HIRE_LIMITS },
  });
}

// PATCH /api/hire/account — org name / retention window.
export async function PATCH(req: Request) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "bad_request");
  }
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof d.orgName === "string" && d.orgName.trim()) {
    ctx.account.orgName = d.orgName.trim().slice(0, 80);
  }
  if (typeof d.retentionDays === "number") {
    // Applies to future intakes; existing candidates keep their purgeAfter.
    ctx.account.retentionDays = clampRetentionDays(d.retentionDays);
  }
  await saveAccount(ctx.account);
  return NextResponse.json({
    ok: true,
    account: {
      orgName: ctx.account.orgName,
      retentionDays: ctx.account.retentionDays,
    },
  });
}

// DELETE /api/hire/account — full erasure (DPDP): every role, candidate,
// audit event and the account record itself, hard-deleted.
export async function DELETE(req: Request) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const deleted = await deleteAllAccountData(ctx.account.id);
  // The audit trail is gone with the tenant — log the erasure server-side so
  // the operation itself remains traceable (no candidate PII in the line).
  console.log(
    `[hire:account] full erasure for account ${ctx.account.id} by ${ctx.session.email} — ${deleted} candidate records deleted`,
  );
  return NextResponse.json({ ok: true, candidatesDeleted: deleted });
}
