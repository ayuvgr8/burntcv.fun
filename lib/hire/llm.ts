// BurntCV Hire — LLM calls for the evidence stage (Stage A of the engine).
//
// Determinism posture: temperature 0, exact model pins, and the direct
// Anthropic path whenever ANTHROPIC_API_KEY is set (the gateway is great for
// the roast's cost dashboards, but the screening pipeline wants one fewer
// moving part between "same input" and "same output"). Every call returns
// parsed JSON or throws — the caller (pipeline) turns failures into a
// human-review flag, never a guess.
//
// Model selection per stage (PRD-Hire §6.1), env-overridable, never hard-coded
// at call sites:
//   decompose  HIRE_MODEL_DECOMPOSE  (default claude-sonnet-5)   once per role
//   extract    HIRE_MODEL_EXTRACT    (default claude-haiku-4-5)  per candidate, cheap+fast
//   rate       HIRE_MODEL_RATE       (default claude-sonnet-5)   where errors hurt most
//   questions  HIRE_MODEL_QUESTIONS  (default claude-sonnet-5)

import { callClaude, type ClaudeUsage } from "../anthropic";

export type HireStage = "decompose" | "extract" | "rate" | "questions";

const DIRECT_DEFAULTS: Record<HireStage, string> = {
  decompose: "claude-sonnet-5",
  extract: "claude-haiku-4-5",
  rate: "claude-sonnet-5",
  questions: "claude-sonnet-5",
};

// Gateway slugs are provider-prefixed and dotted — only used when no direct
// key exists and the gateway is the sole configured path.
const GATEWAY_DEFAULTS: Record<HireStage, string> = {
  decompose: "anthropic/claude-sonnet-5",
  extract: "anthropic/claude-haiku-4.5",
  rate: "anthropic/claude-sonnet-5",
  questions: "anthropic/claude-sonnet-5",
};

const ENV_KEYS: Record<HireStage, string> = {
  decompose: "HIRE_MODEL_DECOMPOSE",
  extract: "HIRE_MODEL_EXTRACT",
  rate: "HIRE_MODEL_RATE",
  questions: "HIRE_MODEL_QUESTIONS",
};

export function hireModelFor(stage: HireStage): string {
  const override = process.env[ENV_KEYS[stage]];
  if (override) return override;
  const direct = !!process.env.ANTHROPIC_API_KEY;
  return direct ? DIRECT_DEFAULTS[stage] : GATEWAY_DEFAULTS[stage];
}

// Pull the first top-level JSON value out of a model reply, tolerating code
// fences and stray prose around it.
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const starts = [cleaned.indexOf("{"), cleaned.indexOf("[")].filter((i) => i >= 0);
  if (!starts.length) throw new Error("no_json");
  const start = Math.min(...starts);
  const endChar = cleaned[start] === "{" ? "}" : "]";
  const end = cleaned.lastIndexOf(endChar);
  if (end <= start) throw new Error("no_json");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export interface HireLlmResult<T> {
  data: T;
  model: string;
  usage: ClaudeUsage; // summed across the parse-retry, for spend accounting
}

// One JSON-mode call with a single parse-failure retry. Temperature 0 on
// everything — reproducibility is a product feature here, not a nicety.
export async function callHireJson<T>(args: {
  stage: HireStage;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<HireLlmResult<T>> {
  const model = hireModelFor(args.stage);
  const directKey = process.env.ANTHROPIC_API_KEY || "";
  const maxTokens = args.maxTokens ?? 4096;

  const attempt = async (prompt: string) => {
    // Passing the platform key as `apiKey` forces the direct path — exact
    // model string, no gateway rewrite. Without a direct key we fall through
    // to callClaude's own routing (gateway) with a gateway-format slug.
    const base = { apiKey: directKey, model, maxTokens, system: args.system };
    try {
      return await callClaude(prompt, { ...base, temperature: 0 });
    } catch (err) {
      // Claude 5-family models reject `temperature` outright ("deprecated for
      // this model"); older tiers still want it pinned low. Adapt at runtime
      // instead of hard-coding a family list that ages badly.
      const msg = err instanceof Error ? err.message : "";
      if (/anthropic_400/.test(msg) && /temperature/i.test(msg)) {
        return callClaude(prompt, base);
      }
      throw err;
    }
  };

  const usage: ClaudeUsage = { input_tokens: 0, output_tokens: 0 };
  const track = (u: ClaudeUsage) => {
    usage.input_tokens += u.input_tokens;
    usage.output_tokens += u.output_tokens;
  };

  let text: string;
  try {
    const res = await attempt(args.prompt);
    track(res.usage);
    text = res.text;
  } catch (err) {
    console.error(`[hire:llm] ${args.stage} call failed:`, err);
    throw new Error(`llm_${args.stage}_failed`);
  }

  try {
    return { data: extractJson(text) as T, model, usage };
  } catch {
    // One structured retry: same contract, explicit reminder. Still failing →
    // the pipeline routes the candidate to human review.
    console.warn(`[hire:llm] ${args.stage} returned unparseable JSON — retrying once`);
    const retry = await attempt(
      `${args.prompt}\n\nREMINDER: Your previous reply was not valid JSON. Output ONLY the JSON — no prose, no code fences.`,
    );
    track(retry.usage);
    try {
      return { data: extractJson(retry.text) as T, model, usage };
    } catch {
      throw new Error(`llm_${args.stage}_bad_json`);
    }
  }
}
