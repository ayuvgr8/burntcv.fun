// Server-side Claude caller. Never expose the platform key to the client (PRD §9).
// Model default: Sonnet 4.6 — the wit/latency/cost sweet spot for a viral free
// tier (time-to-first-laugh < 30s). Override with ROAST_MODEL.
//
// Routing: when AI_GATEWAY_API_KEY is set, platform-key calls go through the
// Vercel AI Gateway's Anthropic-compatible Messages endpoint — same request
// shape, drop-in, but gives per-request cost/latency/spend dashboards and
// provider failover in the Vercel dashboard. If the gateway REJECTS us for a
// config/auth reason (401/403 — e.g. no credit card on file, bad/scoped key) we
// fall back to calling Anthropic directly on ANTHROPIC_API_KEY so real roasts are
// never degraded by a gateway misconfig. We do NOT fall back on 402 (budget cap),
// 429 (rate limit) or 529 (overload) — those are intentional signals to honor.
// BYOK calls (opts.apiKey passed) always go direct and never touch the gateway.

const ANTHROPIC_DIRECT_URL = "https://api.anthropic.com/v1/messages";
// Vercel AI Gateway is a drop-in for the Anthropic Messages API (same /v1/messages
// path + x-api-key header); it only needs the provider-prefixed, dotted model slug.
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/messages";

// Direct-Anthropic slug uses hyphens; the gateway slug is provider-prefixed with dots.
export const ROAST_MODEL = process.env.ROAST_MODEL ?? "claude-sonnet-4-6";
const GATEWAY_MODEL =
  process.env.GATEWAY_ROAST_MODEL ?? "anthropic/claude-sonnet-4.6";
const REQUEST_TIMEOUT_MS = Number(process.env.ROAST_TIMEOUT_MS ?? 45000);

// One raw Messages request against either endpoint. Throws `anthropic_<status>:…`
// on non-2xx, `timeout` on abort. `via` is only for the usage log line.
async function dispatch(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  via: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
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
  // Log token usage for lightweight cost visibility in server logs. The gateway
  // dashboard already tracks spend; this is the belt-and-suspenders view and the
  // only signal on the direct-Anthropic path.
  if (data.usage) {
    console.log(
      `[claude] via=${via} model=${model} in=${
        data.usage.input_tokens ?? "?"
      } out=${data.usage.output_tokens ?? "?"}`,
    );
  }
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  if (!text) throw new Error("empty_response");
  return text;
}

export async function callClaude(
  prompt: string,
  opts: { apiKey: string; model?: string; maxTokens?: number } = { apiKey: "" },
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 1024;
  const byok = opts.apiKey || "";
  const gatewayKey = process.env.AI_GATEWAY_API_KEY || "";
  const directKey = process.env.ANTHROPIC_API_KEY || "";

  // BYOK → always direct with the user's own Anthropic key.
  if (byok) {
    return dispatch(
      ANTHROPIC_DIRECT_URL,
      byok,
      opts.model ?? ROAST_MODEL,
      prompt,
      maxTokens,
      "byok",
    );
  }

  // Platform call: prefer the gateway, but fall back to the direct key if the
  // gateway rejects us for a config/auth reason so roasts don't degrade.
  if (gatewayKey) {
    try {
      return await dispatch(
        GATEWAY_URL,
        gatewayKey,
        opts.model ?? GATEWAY_MODEL,
        prompt,
        maxTokens,
        "gateway",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (directKey && /anthropic_(401|403)/.test(msg)) {
        console.warn(
          `[claude] gateway rejected (${msg.slice(0, 80)}) — falling back to direct Anthropic`,
        );
        return dispatch(
          ANTHROPIC_DIRECT_URL,
          directKey,
          opts.model ?? ROAST_MODEL,
          prompt,
          maxTokens,
          "direct-fallback",
        );
      }
      throw err;
    }
  }

  // No gateway configured → direct path (original behavior).
  if (!directKey) throw new Error("no_api_key");
  return dispatch(
    ANTHROPIC_DIRECT_URL,
    directKey,
    opts.model ?? ROAST_MODEL,
    prompt,
    maxTokens,
    "direct",
  );
}
