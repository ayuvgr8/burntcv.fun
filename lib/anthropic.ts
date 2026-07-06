// Server-side Claude caller. Never expose the platform key to the client (PRD §9).
// Model default: Sonnet 4.6 — the wit/latency/cost sweet spot for a viral free
// tier (time-to-first-laugh < 30s). Override with ROAST_MODEL.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const ROAST_MODEL = process.env.ROAST_MODEL ?? "claude-sonnet-4-6";
const REQUEST_TIMEOUT_MS = Number(process.env.ROAST_TIMEOUT_MS ?? 45000);

export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface ClaudeResult {
  text: string;
  model: string;
  usage: ClaudeUsage;
}

export async function callClaude(
  prompt: string,
  opts: { apiKey: string; model?: string; maxTokens?: number } = { apiKey: "" },
): Promise<ClaudeResult> {
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY || "";
  if (!apiKey) throw new Error("no_api_key");

  const model = opts.model ?? ROAST_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`anthropic_${res.status}:${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  if (!text) throw new Error("empty_response");
  return {
    text,
    model,
    usage: {
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
    },
  };
}
