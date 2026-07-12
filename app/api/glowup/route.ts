import { NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { checkAndIncrement, ipFrom, limitUser } from "@/lib/ratelimit";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";
import { verifyToken, consumePassGlowup } from "@/lib/entitlements";
import {
  buildGlowupPrompt,
  normalizeGlowup,
  INPUT_CHAR_CAP,
  parseRoastJSON,
  type Glowup,
} from "@/lib/roast";
import { parseJsonBody, vBool, vString } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

// Reject absurd pastes up front; legitimate input is capped for the prompt below.
const TEXT_HARD_CAP = 20_000;
const JOB_DESC_MAX = 5_000;

const glowupSchema = {
  text: vString({ trim: true, min: 40, max: TEXT_HARD_CAP }),
  passToken: vString({ optional: true, max: 4096 }),
  paid: vBool({ optional: true, default: false }),
  jobDescription: vString({ optional: true, max: JOB_DESC_MAX }),
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

  const prompt = buildGlowupPrompt(body.jobDescription) + "\n\nINPUT:\n" + text;

  let glowup: Glowup | null = null;
  try {
    const res = await callClaude(prompt, { apiKey: "" });
    await recordSpend(res.model, res.usage);
    glowup = parseRoastJSON<Glowup>(res.text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "no_api_key") {
      return NextResponse.json({ error: "no_server_key" }, { status: 503 });
    }
    glowup = null;
  }

  glowup = normalizeGlowup(glowup);
  return NextResponse.json({ glowup, glowupsLeft });
}
