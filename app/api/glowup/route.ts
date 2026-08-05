import { NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { checkAndIncrement, ipFrom, limitUser } from "@/lib/ratelimit";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";
import { verifyToken, consumePassGlowup } from "@/lib/entitlements";
import { markGlowupDelivered } from "@/lib/receipt";
import {
  buildGlowupRewritePrompt,
  buildGlowupStrategyPrompt,
  buildGlowupFuturePrompt,
  normalizeGlowup,
  INPUT_CHAR_CAP,
  JD_CHAR_CAP,
  ROLE_CHAR_CAP,
  parseRoastJSON,
  type Glowup,
} from "@/lib/roast";
import { parseJsonBody, vBool, vString } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

// Reject absurd pastes up front; legitimate input is capped for the prompt below.
const TEXT_HARD_CAP = 20_000;

// The paid deliverable — 5 rewrites with the reasoning behind each, an action
// plan, strengths, ATS gaps, landmines. Well past the 1024 default; truncation
// here would hand a paying user the canned fallback.
const GLOWUP_MAX_TOKENS = 4096;

const glowupSchema = {
  text: vString({ trim: true, min: 40, max: TEXT_HARD_CAP }),
  passToken: vString({ optional: true, max: 4096 }),
  paid: vBool({ optional: true, default: false }),
  // The role the user is applying for (asked before payment) + the optional
  // job description pasted alongside it.
  targetRole: vString({ optional: true, trim: true, max: ROLE_CHAR_CAP }),
  jobDescription: vString({ optional: true, trim: true, max: JD_CHAR_CAP }),
};

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, glowupSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  }
  const body = parsed.value;

  const text = body.text.slice(0, INPUT_CHAR_CAP);

  // Everyone who reaches here uses the platform key (BYOK runs in the browser),
  // so the global daily spend cap applies to all — Pass holders included.
  if (!(await budgetAvailable())) {
    return NextResponse.json({ error: "budget_exhausted" }, { status: 503 });
  }

  // Gate the Glow-Up. The Pass includes GLOWUPS_PER_PASS free rewrites, then
  // ₹49 each like everyone else:
  //  - Valid Pass, not a paid top-up → consume one of the Pass's credits. When
  //    they run out we return 402 so the client charges ₹49 and retries with
  //    `paid:true`.
  //  - Everyone else (no Pass, or a ₹49 top-up the client just paid for) →
  //    per-IP limited so the paywall can't be bypassed by calling the route.
  const pass = verifyToken(body.passToken);
  let glowupsLeft: number | undefined;
  if (pass && !body.paid) {
    // Authenticated tier: loose per-Pass burst ceiling (see roast route).
    const burst = await limitUser(pass.code, "glowup");
    if (!burst.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: burst.retryAfter },
        { status: 429, headers: { "retry-after": String(burst.retryAfter) } },
      );
    }
    const remaining = await consumePassGlowup(pass.code);
    if (remaining < 0) {
      return NextResponse.json(
        { error: "glowups_exhausted", glowupsLeft: 0 },
        { status: 402 },
      );
    }
    glowupsLeft = remaining;
  } else {
    const { allowed } = await checkAndIncrement(ipFrom(req));
    if (!allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }

  const input = "\n\nINPUT:\n" + text;
  const target = { role: body.targetRole, jobDescription: body.jobDescription };

  // Both halves at once — see lib/roast.ts. Each is independently recoverable,
  // so a failure in one still leaves the user with the other half's real work.
  const part = async (
    label: string,
    prompt: string,
  ): Promise<Partial<Glowup> | null> => {
    const res = await callClaude(prompt, { apiKey: "", maxTokens: GLOWUP_MAX_TOKENS });
    await recordSpend(res.model, res.usage);
    const parsedPart = parseRoastJSON<Partial<Glowup>>(res.text);
    if (!parsedPart) console.error(`[glowup] ${label} returned unparseable JSON`);
    return parsedPart;
  };

  // The rewrite is the core deliverable, so its failure mode is the one that
  // matters — it alone can surface no_server_key. The other two degrade to the
  // fallback for their own sections without taking the whole report down.
  const soft = (label: string, prompt: string) =>
    part(label, prompt).catch((err) => {
      console.error(`[glowup] ${label} failed:`, err?.message);
      return null;
    });

  let parts: (Partial<Glowup> | null)[];
  try {
    parts = await Promise.all([
      part("rewrite", buildGlowupRewritePrompt(target) + input),
      soft("strategy", buildGlowupStrategyPrompt(target) + input),
      soft("future", buildGlowupFuturePrompt(target) + input),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "no_api_key") {
      return NextResponse.json({ error: "no_server_key" }, { status: 503 });
    }
    console.error("[glowup] rewrite part failed:", msg);
    parts = [];
  }

  const glowup = normalizeGlowup(Object.assign({}, ...parts.map((p) => p ?? {})));

  // Receipt for the jobs column (/api/jobs). It rides along with a Glow-Up the
  // user already paid for, so it must not cost another credit — but it also
  // can't be an open endpoint burning our third-party job-API quota. This proves
  // the follow-up request is for a résumé that just got a Glow-Up.
  await markGlowupDelivered(text);

  return NextResponse.json({ glowup, glowupsLeft });
}
