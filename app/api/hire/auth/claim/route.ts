import { NextResponse } from "next/server";
import { signSession, verifyMagic } from "@/lib/hire/auth";
import { jsonError } from "@/lib/hire/api";
import { appendAudit, ensureAccount, saveAccount, screensUsed } from "@/lib/hire/store";
import { HIRE_LIMITS } from "@/lib/hire/config";
import { ipFrom, limitPublic } from "@/lib/ratelimit";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";

// Exchange a magic-link token for a session. Creates the recruiter account on
// first sign-in (the magic link proves mailbox ownership).
export async function POST(req: Request) {
  const gate = await limitPublic(ipFrom(req), "hire-auth");
  if (!gate.allowed) {
    return jsonError(429, "rate_limited", { retryAfter: gate.retryAfter });
  }

  const body = await parseJsonBody(req, { token: vString({ max: 2048 }) });
  if (!body.ok) return jsonError(body.status, body.error);

  const magic = verifyMagic(body.value.token);
  if (!magic) return jsonError(401, "bad_or_expired_link");

  const account = await ensureAccount(magic.email, magic.orgName);
  if (magic.orgName && account.orgName !== magic.orgName && account.orgName === "My team") {
    // The sign-in form supplied an org name for an account created bare.
    account.orgName = magic.orgName;
    await saveAccount(account);
  }
  await appendAudit(account.id, {
    actor: magic.email,
    action: "auth.signed_in",
    targetType: "account",
    targetId: account.id,
    meta: {},
  });

  return NextResponse.json({
    token: signSession(account.id, magic.email),
    account: {
      orgName: account.orgName,
      email: account.ownerEmail,
      retentionDays: account.retentionDays,
    },
    usage: { screensUsed: await screensUsed(account.id), limits: HIRE_LIMITS },
  });
}
