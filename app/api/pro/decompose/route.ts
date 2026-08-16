import { NextResponse } from "next/server";
import { HIRE_LIMITS } from "@/lib/hire/config";
import { callHireJson } from "@/lib/hire/llm";
import { decomposeContract, type DecomposeOut } from "@/lib/hire/prompts";
import type { ReqCategory, Requirement } from "@/lib/hire/types";
import {
  consumeProCredit,
  refundProCredit,
  resolveProAccess,
  statusFor,
} from "@/lib/pro/entitlements";
import { consumeProReport, refundProReport } from "@/lib/pro/limits";
import { ipFrom, limitPublic, rateLimitedResponse } from "@/lib/ratelimit";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const CATEGORIES = new Set<string>(["MUST_HAVE", "PREFERRED", "IMPLICIT"]);

// BurntCV Pro, stage 1 of 4 — decompose the target JD into the screener's
// requirement bar. STATELESS: the result goes back to the browser, which
// carries it into /extract → /rate → /coach. Nothing is stored server-side
// (the roast promise applies to Pro verbatim).
//
// This is the chain's metered entry point: one Pro report per call, counted
// per IP per day.
export async function POST(req: Request) {
  const ip = ipFrom(req);
  const burst = await limitPublic(ip, "pro");
  if (!burst.allowed) return rateLimitedResponse(burst.retryAfter);

  const body = await parseJsonBody(
    req,
    {
      jdText: vString({ min: 80, max: HIRE_LIMITS.maxJdChars }),
      proToken: vString({ optional: true, max: 2048 }),
    },
    { maxBytes: 128 * 1024 },
  );
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  // Paid path first: an active pass runs free of metering; a credit is
  // consumed per report. Paid reports also bypass the platform's daily free
  // budget cap — the user paid, the cap protects the FREE tier's spend.
  const access = await resolveProAccess(body.value.proToken);
  let usedCredit = false;
  let usedFreeReport = false;
  let freeReportsLeft: number | null = null;

  if (access.entitled && access.rec) {
    if (!access.viaPass) {
      usedCredit = await consumeProCredit(access.rec.code);
      if (!usedCredit) access.entitled = false; // raced to zero — fall through
    }
  }

  if (!access.entitled || !access.rec) {
    // Free tier: platform budget + per-IP daily cap.
    if (!(await budgetAvailable())) {
      return NextResponse.json({ error: "budget_exhausted" }, { status: 402 });
    }
    const gate = await consumeProReport(ip);
    if (!gate.allowed) {
      // 402, not 429: the free allowance is spent — this is the paywall signal.
      return NextResponse.json(
        { error: "payment_required", reason: "daily_limit" },
        { status: 402 },
      );
    }
    usedFreeReport = true;
    freeReportsLeft = gate.remaining;
  }

  try {
    const { system, prompt } = decomposeContract(body.value.jdText);
    const res = await callHireJson<DecomposeOut>({
      stage: "decompose",
      system,
      prompt,
      maxTokens: 6000,
    });
    await recordSpend(res.model, res.usage);

    // Candidate-side has no recruiter confirm gate — the AI's knockout
    // suggestions surface directly as "auto-filter risk" so the report warns
    // exactly where a real screener would hard-filter.
    const requirements: Requirement[] = (res.data.requirements ?? [])
      .filter((r) => r && typeof r.label === "string" && r.label.trim())
      .slice(0, 15)
      .map((r, i) => ({
        id: `req_${i}`,
        label: r.label.trim().slice(0, 120),
        category: (CATEGORIES.has(r.category) ? r.category : "PREFERRED") as ReqCategory,
        weight: Math.min(10, Math.max(1, Math.round(Number(r.suggestedWeight) || 5))),
        isKnockout: !!r.isKnockoutCandidate,
        knockoutSuggested: !!r.isKnockoutCandidate,
        detail: typeof r.detail === "string" ? r.detail.slice(0, 600) : "",
        rationale: typeof r.rationale === "string" ? r.rationale.slice(0, 300) : "",
        source: "AI",
        orderIndex: i,
      }));

    if (requirements.length === 0) {
      await refund();
      return NextResponse.json({ error: "decomposition_empty" }, { status: 502 });
    }

    return NextResponse.json({
      roleTitle:
        typeof res.data.roleTitle === "string" ? res.data.roleTitle.slice(0, 120) : "This role",
      seniority: typeof res.data.seniority === "string" ? res.data.seniority : "unknown",
      notes: typeof res.data.notes === "string" ? res.data.notes.slice(0, 1000) : "",
      requirements,
      // Entitlement state for the UI badge: paid status when a token was used,
      // free-tier remainder otherwise.
      reportsLeftToday: freeReportsLeft,
      pro: access.rec ? await statusFor(access.rec) : null,
      paid: usedCredit || (access.entitled && access.viaPass),
    });
  } catch (err) {
    // The report never started — hand back whatever was consumed.
    await refund();
    console.error("[pro:decompose] failed:", err);
    return NextResponse.json({ error: "decompose_failed" }, { status: 502 });
  }

  async function refund() {
    if (usedCredit && access.rec) await refundProCredit(access.rec.code);
    if (usedFreeReport) await refundProReport(ip);
  }
}
