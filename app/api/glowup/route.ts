import { NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
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

  const prompt = buildGlowupPrompt() + "\n\nINPUT:\n" + text;

  let glowup: Glowup | null = null;
  try {
    const raw = await callClaude(prompt, { apiKey: "" });
    glowup = parseRoastJSON<Glowup>(raw);
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
