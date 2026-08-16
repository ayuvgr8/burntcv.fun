import { NextResponse } from "next/server";
import { isErrorResponse, requireAccount } from "@/lib/hire/api";
import { listAudit } from "@/lib/hire/store";

export const runtime = "nodejs";

// GET /api/hire/audit — the account's append-only audit trail, newest first.
// This is the "every decision has a paper trail" surface (PRD-Hire §15.5).
export async function GET(req: Request) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  return NextResponse.json({ events: await listAudit(ctx.account.id, 100) });
}
