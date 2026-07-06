import { NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { checkAndIncrement, ipFrom } from "@/lib/ratelimit";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";
import { verifyToken, consumePassGlowup } from "@/lib/entitlements";
import {
  buildGlowupPrompt,
  fallbackGlowup,
  INPUT_CHAR_CAP,
  parseRoastJSON,
  type Glowup,
} from "@/lib/roast";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { text?: string; passToken?: string; paid?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const text = (body.text ?? "").slice(0, INPUT_CHAR_CAP);
  if (text.trim().length < 40) {
    return NextResponse.json({ error: "too_short" }, { status: 400 });
  }

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

  const prompt = buildGlowupPrompt() + "\n\nINPUT:\n" + text;

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

  if (!glowup || !Array.isArray(glowup.rewrites)) glowup = fallbackGlowup();
  return NextResponse.json({ glowup, glowupsLeft });
}
