// BurntCV Hire — route-handler helpers: session gate + error shape.

import { NextResponse } from "next/server";
import { sessionFrom, type HireSession } from "./auth";
import { getAccount } from "./store";
import type { HireAccount } from "./types";

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export interface AuthedContext {
  session: HireSession;
  account: HireAccount;
}

// Every Hire data route goes through this: a valid signed session AND a live
// account record. The session's accountId then scopes every store call —
// cross-tenant access is structurally impossible (see lib/hire/store.ts).
export async function requireAccount(
  req: Request,
): Promise<AuthedContext | NextResponse> {
  const session = sessionFrom(req);
  if (!session) return jsonError(401, "unauthorized");
  const account = await getAccount(session.accountId);
  if (!account) return jsonError(401, "account_gone");
  return { session, account };
}

export function isErrorResponse(x: AuthedContext | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}
