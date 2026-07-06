"use client";

// Client-side API layer. Two paths:
//  - Free / Pro: hit our server route (platform key + rate limiting).
//  - BYOK: call Anthropic directly from the browser so the key never touches
//    our server (honors the "we never see it" promise, PRD §10).

import {
  buildGlowupPrompt,
  buildRoastPrompt,
  fallbackGlowup,
  normalizeGlowup,
  fallbackRoast,
  INPUT_CHAR_CAP,
  isValidRoast,
  parseRoastJSON,
  type Glowup,
  type Roast,
} from "./roast";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const BYOK_MODEL = "claude-sonnet-4-6";

export type RoastResult =
  | { ok: true; roast: Roast; passRoastsLeft?: number }
  | {
      ok: false;
      reason:
        | "rate_limited"
        | "no_server_key"
        | "overloaded"
        | "daily_exhausted" // India Pass: today's 5 are gone
        | "pass_exhausted"; // International Pass: all 400 are gone
    };

async function callClaudeDirect(prompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: BYOK_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`anthropic_${res.status}`);
  const data = await res.json();
  return data?.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
}

export async function requestRoast(args: {
  text: string;
  persona: string;
  intensity: string;
  linkedin: boolean;
  apiKey: string;
  passToken: string; // server-verified Pass token → bypasses the IP rate limit
}): Promise<RoastResult> {
  const text = (args.text || "").slice(0, INPUT_CHAR_CAP);

  // BYOK — call Anthropic straight from the browser.
  if (args.apiKey) {
    try {
      const prompt =
        buildRoastPrompt(args.persona, args.intensity, args.linkedin) +
        "\n\nINPUT:\n" +
        text;
      let raw = await callClaudeDirect(prompt, args.apiKey);
      let roast = parseRoastJSON<Roast>(raw);
      if (!isValidRoast(roast)) {
        raw = await callClaudeDirect(
          prompt + "\n\nReturn ONLY the JSON object. No other text.",
          args.apiKey,
        );
        roast = parseRoastJSON<Roast>(raw);
      }
      return { ok: true, roast: isValidRoast(roast) ? roast : fallbackRoast() };
    } catch {
      return { ok: true, roast: fallbackRoast() };
    }
  }

  // Free / Pro — server route.
  try {
    const res = await fetch("/api/roast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text,
        persona: args.persona,
        intensity: args.intensity,
        linkedin: args.linkedin,
        passToken: args.passToken,
      }),
    });
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    const data = await res.json().catch(() => ({}));
    // Pass allowance spent (server-enforced) → route to the right paywall.
    if (res.status === 402) {
      return {
        ok: false,
        reason: data?.error === "pass_exhausted" ? "pass_exhausted" : "daily_exhausted",
      };
    }
    if (res.status === 503) {
      return {
        ok: false,
        reason: data?.error === "overloaded" ? "overloaded" : "no_server_key",
      };
    }
    const roast = data?.roast;
    return {
      ok: true,
      roast: isValidRoast(roast) ? roast : fallbackRoast(),
      passRoastsLeft:
        typeof data?.passRoastsLeft === "number" ? data.passRoastsLeft : undefined,
    };
  } catch {
    return { ok: true, roast: fallbackRoast() };
  }
}

export interface GlowupResult {
  glowup: Glowup;
  glowupsLeft?: number; // Pass Glow-Ups remaining after this one (Pass path only)
  exhausted?: boolean; // Pass had no Glow-Ups left → caller should charge ₹49
}

export async function requestGlowup(args: {
  text: string;
  apiKey: string;
  passToken: string;
  paid?: boolean; // a ₹49 top-up the user just paid for → don't spend a Pass credit
}): Promise<GlowupResult> {
  const text = (args.text || "").slice(0, INPUT_CHAR_CAP);
  if (args.apiKey) {
    try {
      const raw = await callClaudeDirect(
        buildGlowupPrompt() + "\n\nINPUT:\n" + text,
        args.apiKey,
      );
      return { glowup: normalizeGlowup(parseRoastJSON<Glowup>(raw)) };
    } catch {
      return { glowup: fallbackGlowup() };
    }
  }
  try {
    const res = await fetch("/api/glowup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, passToken: args.passToken, paid: args.paid }),
    });
    const data = await res.json().catch(() => ({}));
    // Pass out of Glow-Ups → tell the caller to send the user to the ₹49 paywall.
    if (res.status === 402 && data?.error === "glowups_exhausted") {
      return { glowup: fallbackGlowup(), glowupsLeft: 0, exhausted: true };
    }
    return {
      glowup: normalizeGlowup(data?.glowup),
      glowupsLeft:
        typeof data?.glowupsLeft === "number" ? data.glowupsLeft : undefined,
    };
  } catch {
    return { glowup: fallbackGlowup() };
  }
}

export async function extractPdf(file: File): Promise<string | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/extract", { method: "POST", body: form });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.text === "string" ? data.text : null;
  } catch {
    return null;
  }
}
