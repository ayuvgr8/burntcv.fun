import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import { advanceCandidate } from "@/lib/hire/pipeline";
import { getCandidate, getRole } from "@/lib/hire/store";
import { limitUser } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ candId: string }> };

// POST /api/hire/candidates/:candId/process — advance the pipeline exactly one
// stage (new→extracted→rated→scored). The client calls this in a loop until
// `done`; each hop fits inside a serverless timeout and failures route the
// candidate to human review instead of guessing (PRD-Hire §14).
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

  const { candidate, done } = await advanceCandidate(role, cand);
  return NextResponse.json({
    stage: candidate.stage,
    stageError: candidate.stageError,
    done,
    band: candidate.fitReport?.band ?? null,
  });
}
