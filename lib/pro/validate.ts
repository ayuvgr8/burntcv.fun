// BurntCV Pro — validators for client-held pipeline intermediates.
//
// Pro is STATELESS by design: the server computes a stage and hands the JSON
// back; the browser carries it to the next stage call. Nothing touches
// storage, which is what keeps the roast-side "we never store your résumé"
// promise literally true for Pro too. The price of statelessness is that every
// stage's input arrives from the client — so each round-tripped structure is
// re-sanitized here before it feeds a prompt or the engine. (A user "tampering"
// only skews their own report; the sanitizers are about crashes and prompt
// hygiene, not trust.)
//
// The engine itself is the SAME code as BurntCV Hire — lib/hire/{prompts,
// engine,llm}. Pro is a different wrapper around it, not a different engine.

import { sanitizeExtraction } from "../hire/extraction";
import type { Requirement, ResumeExtraction } from "../hire/types";

const CATEGORIES = new Set(["MUST_HAVE", "PREFERRED", "IMPLICIT"]);

// Round-tripped requirements list (from /api/pro/decompose). Candidate-side
// has no recruiter confirm gate — the AI's knockout suggestions ARE the
// "auto-filter risk" warnings, so knockoutSuggested maps onto isKnockout and
// the engine flags them exactly like a real screener would.
export function sanitizeRequirements(raw: unknown): Requirement[] {
  if (!Array.isArray(raw)) return [];
  const out: Requirement[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length && out.length < 15; i++) {
    const item = raw[i];
    if (typeof item !== "object" || item === null) continue;
    const d = item as Record<string, unknown>;
    const label = typeof d.label === "string" ? d.label.trim().slice(0, 120) : "";
    if (!label) continue;
    const id =
      typeof d.id === "string" && /^[\w-]{1,40}$/.test(d.id) ? d.id : `req_${i}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const knockout = d.isKnockout === true || d.knockoutSuggested === true;
    out.push({
      id,
      label,
      category: (CATEGORIES.has(d.category as string)
        ? d.category
        : "PREFERRED") as Requirement["category"],
      weight: Math.min(10, Math.max(1, Math.round(Number(d.weight) || 5))),
      isKnockout: knockout,
      knockoutSuggested: knockout,
      detail: typeof d.detail === "string" ? d.detail.slice(0, 600) : "",
      rationale: typeof d.rationale === "string" ? d.rationale.slice(0, 300) : "",
      source: "AI",
      orderIndex: i,
    });
  }
  return out;
}

// Round-tripped extraction (from /api/pro/extract) — same shape-guard the Hire
// pipeline uses, re-exported through ./extraction so both products share it.
export function sanitizeRoundTrippedExtraction(raw: unknown): ResumeExtraction {
  return sanitizeExtraction(raw);
}
