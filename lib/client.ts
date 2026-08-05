"use client";

// Client-side API layer. Two paths:
//  - Free / Pro: hit our server route (platform key + rate limiting).
//  - BYOK: call Anthropic directly from the browser so the key never touches
//    our server (honors the "we never see it" promise, PRD §10).

import {
  buildGlowupRewritePrompt,
  buildGlowupStrategyPrompt,
  buildGlowupFuturePrompt,
  buildRoastPrompt,
  fallbackGlowup,
  normalizeGlowup,
  fallbackRoast,
  INPUT_CHAR_CAP,
  JD_CHAR_CAP,
  ROLE_CHAR_CAP,
  isValidRoast,
  normalizeRoast,
  parseRoastJSON,
  type Glowup,
  type Roast,
} from "./roast";
import type { JobsPayload, VerifyStatus } from "./jobs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const BYOK_MODEL = "claude-sonnet-4-6";
// Must match the server routes — the richer roast/Glow-Up payloads overflow the
// old 1024 ceiling, and a truncated response parses to nothing.
const ROAST_MAX_TOKENS = 2048;
const GLOWUP_MAX_TOKENS = 4096;

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

async function callClaudeDirect(
  prompt: string,
  apiKey: string,
  maxTokens: number,
): Promise<string> {
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
        max_tokens: maxTokens,
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
      let raw = await callClaudeDirect(prompt, args.apiKey, ROAST_MAX_TOKENS);
      let roast = parseRoastJSON<Roast>(raw);
      if (!isValidRoast(roast)) {
        raw = await callClaudeDirect(
          prompt + "\n\nReturn ONLY the JSON object. No other text.",
          args.apiKey,
          ROAST_MAX_TOKENS,
        );
        roast = parseRoastJSON<Roast>(raw);
      }
      return {
        ok: true,
        roast: normalizeRoast(isValidRoast(roast) ? roast : fallbackRoast()),
      };
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
      roast: normalizeRoast(isValidRoast(roast) ? roast : fallbackRoast()),
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
  targetRole?: string; // the role they're applying for (collected before payment)
  jobDescription?: string; // optional JD paste — tailors the rewrite to the posting
}): Promise<GlowupResult> {
  const text = (args.text || "").slice(0, INPUT_CHAR_CAP);
  const targetRole = (args.targetRole || "").trim().slice(0, ROLE_CHAR_CAP);
  const jobDescription = (args.jobDescription || "").trim().slice(0, JD_CHAR_CAP);
  if (args.apiKey) {
    try {
      // Three parts in parallel, matching the server route (see lib/roast.ts).
      const input = "\n\nINPUT:\n" + text;
      const target = { role: targetRole, jobDescription };
      const part = (prompt: string) =>
        callClaudeDirect(prompt, args.apiKey, GLOWUP_MAX_TOKENS)
          .then((raw) => parseRoastJSON<Partial<Glowup>>(raw))
          .catch(() => null);
      const parts = await Promise.all([
        part(buildGlowupRewritePrompt(target) + input),
        part(buildGlowupStrategyPrompt(target) + input),
        part(buildGlowupFuturePrompt(target) + input),
      ]);
      return {
        glowup: normalizeGlowup(Object.assign({}, ...parts.map((p) => p ?? {}))),
      };
    } catch {
      return { glowup: fallbackGlowup() };
    }
  }
  try {
    const res = await fetch("/api/glowup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text,
        passToken: args.passToken,
        paid: args.paid,
        targetRole,
        jobDescription,
      }),
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

// Live job openings for a finished Glow-Up. Deliberately separate from
// requestGlowup: the report renders first and this fills its last section
// afterwards, so a slow or empty jobs lookup never delays — or breaks — the
// thing the user actually paid for.
export async function requestJobs(args: {
  text: string;
  passToken: string;
  targetRole?: string;
}): Promise<JobsPayload> {
  const empty = (degraded: JobsPayload["degraded"]): JobsPayload => ({
    jobs: [],
    degraded,
    fetchedAt: new Date().toISOString(),
  });
  try {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: (args.text || "").slice(0, INPUT_CHAR_CAP),
        passToken: args.passToken,
        targetRole: (args.targetRole || "").trim().slice(0, ROLE_CHAR_CAP),
      }),
    });
    if (!res.ok) return empty(res.status === 429 ? "quota" : "no_results");
    const data = (await res.json()) as Partial<JobsPayload>;
    return {
      jobs: Array.isArray(data?.jobs) ? data.jobs : [],
      degraded: data?.degraded,
      broadened: data?.broadened,
      fetchedAt: data?.fetchedAt ?? new Date().toISOString(),
    };
  } catch {
    return empty("no_results");
  }
}

// Best-effort "is this still open?" check, fired when a user expands a card.
// Anything short of a confident answer comes back "unverifiable" — the UI says
// so rather than implying a check we didn't manage to make.
export async function verifyJobUrl(
  url: string,
  passToken: string,
): Promise<{ status: VerifyStatus; checkedAt: string }> {
  const unknown = { status: "unverifiable" as VerifyStatus, checkedAt: new Date().toISOString() };
  try {
    const res = await fetch("/api/jobs/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, passToken }),
    });
    if (!res.ok) return unknown;
    const data = await res.json();
    return data?.status === "live" || data?.status === "closed"
      ? { status: data.status, checkedAt: data.checkedAt ?? unknown.checkedAt }
      : unknown;
  } catch {
    return unknown;
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
