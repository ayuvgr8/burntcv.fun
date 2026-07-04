import { NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { checkAndIncrement, ipFrom } from "@/lib/ratelimit";
import { verifyToken } from "@/lib/entitlements";
import {
  buildRoastPrompt,
  fallbackRoast,
  INPUT_CHAR_CAP,
  isValidRoast,
  parseRoastJSON,
  type Roast,
} from "@/lib/roast";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: {
    text?: string;
    persona?: string;
    intensity?: string;
    linkedin?: boolean;
    passToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const text = (body.text ?? "").slice(0, INPUT_CHAR_CAP);
  if (text.trim().length < 40) {
    return NextResponse.json({ error: "too_short" }, { status: 400 });
  }

  // Bypass the rate limit ONLY with a server-verified Pass token — the client
  // can no longer just claim "unlimited". A valid Pass is still day-capped
  // client-side; free/single/top-up roasts fall under the per-IP ceiling.
  // (BYOK users call Anthropic directly and never reach this route.)
  const pass = verifyToken(body.passToken);
  if (!pass) {
    const { allowed } = await checkAndIncrement(ipFrom(req));
    if (!allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }

  const prompt =
    buildRoastPrompt(
      body.persona ?? "recruiter",
      body.intensity ?? "medium",
      !!body.linkedin,
    ) +
    "\n\nINPUT:\n" +
    text;

  let roast: Roast | null = null;
  try {
    let raw = await callClaude(prompt, { apiKey: "" });
    roast = parseRoastJSON<Roast>(raw);
    if (!isValidRoast(roast)) {
      // Retry once with a firmer instruction (defensive parse per PRD §7.3).
      raw = await callClaude(
        prompt + "\n\nReturn ONLY the JSON object. No other text.",
        { apiKey: "" },
      );
      roast = parseRoastJSON<Roast>(raw);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "no_api_key") {
      // No platform key configured — tell the client to prompt for BYOK.
      return NextResponse.json({ error: "no_server_key" }, { status: 503 });
    }
    // Anthropic overloaded / rate-limited / timed out: ask the client to retry
    // rather than serving a canned roast that won't match their résumé.
    if (/anthropic_(429|529)|aborted|timeout/i.test(msg)) {
      console.error("[roast] upstream overloaded:", msg);
      return NextResponse.json({ error: "overloaded" }, { status: 503 });
    }
    console.error("[roast] unexpected error:", msg);
    roast = null;
  }

  // Last resort so the product never hard dead-ends.
  if (!isValidRoast(roast)) roast = fallbackRoast();
  if (!roast.trajectory) roast.trajectory = { satirical: "", real: "" };
  if (!Array.isArray(roast.bento)) roast.bento = [];
  if (!roast.score || typeof roast.score.value !== "number")
    roast.score = fallbackRoast().score;

  return NextResponse.json({ roast });
}
