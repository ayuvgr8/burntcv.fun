import { NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";
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
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const text = (body.text ?? "").slice(0, INPUT_CHAR_CAP);
  if (text.trim().length < 40) {
    return NextResponse.json({ error: "too_short" }, { status: 400 });
  }

  // Glowup runs on the platform key too — respect the same daily spend cap.
  if (!(await budgetAvailable())) {
    return NextResponse.json({ error: "budget_exhausted" }, { status: 503 });
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
  return NextResponse.json({ glowup });
}
