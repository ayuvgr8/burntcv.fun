import { NextResponse } from "next/server";
import { HIRE_LIMITS } from "@/lib/hire/config";
import { sanitizeExtraction } from "@/lib/hire/extraction";
import { callHireJson } from "@/lib/hire/llm";
import { extractContract } from "@/lib/hire/prompts";
import { resolveProAccess } from "@/lib/pro/entitlements";
import { ipFrom, limitPublic, rateLimitedResponse } from "@/lib/ratelimit";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

// BurntCV Pro, stage 2 of 4 — structure the candidate's own résumé with
// evidence provenance (same extraction contract the Hire pipeline uses).
// Stateless: résumé text in, structured JSON out, nothing kept.
export async function POST(req: Request) {
  const ip = ipFrom(req);
  const burst = await limitPublic(ip, "pro");
  if (!burst.allowed) return rateLimitedResponse(burst.retryAfter);

  const body = await parseJsonBody(
    req,
    {
      resumeText: vString({ min: 120, max: HIRE_LIMITS.maxResumeChars }),
      proToken: vString({ optional: true, max: 2048 }),
    },
    { maxBytes: 192 * 1024 },
  );
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  // Paid chains (active pass / credits) bypass the free tier's budget cap.
  const paid = (await resolveProAccess(body.value.proToken)).entitled;
  if (!paid && !(await budgetAvailable())) {
    return NextResponse.json({ error: "budget_exhausted" }, { status: 402 });
  }

  try {
    const { system, prompt } = extractContract(body.value.resumeText);
    const res = await callHireJson<unknown>({
      stage: "extract",
      system,
      prompt,
      maxTokens: 8000,
    });
    await recordSpend(res.model, res.usage);
    return NextResponse.json({ extraction: sanitizeExtraction(res.data) });
  } catch (err) {
    console.error("[pro:extract] failed:", err);
    return NextResponse.json({ error: "extract_failed" }, { status: 502 });
  }
}
