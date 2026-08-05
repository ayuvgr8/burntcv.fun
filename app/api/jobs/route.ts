import { NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { checkAndIncrement, ipFrom, limitUser } from "@/lib/ratelimit";
import { budgetAvailable, recordSpend } from "@/lib/spendcap";
import { verifyToken } from "@/lib/entitlements";
import { hasGlowupReceipt } from "@/lib/receipt";
import { getRedis } from "@/lib/redis";
import { discover, jobsConfigured } from "@/lib/jobsearch";
import {
  BROADEN_DAYS,
  FRESH_DAYS,
  MAX_JOBS,
  buildIntentPrompt,
  buildRankPrompt,
  capPerPublisher,
  dedupe,
  jobsForRanking,
  sanitizeMatchReason,
  usable,
  type Job,
  type JobIntent,
  type JobsPayload,
} from "@/lib/jobs";
import { INPUT_CHAR_CAP, ROLE_CHAR_CAP, parseRoastJSON } from "@/lib/roast";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";
// Discovery alone measures 7-11s (JSearch fans out across Google for Jobs), and
// a broadened retry can double that on top of two Claude calls. 30s was not
// enough headroom.
export const maxDuration = 60;

// Past this point in the request, skip the broaden retry: a second 11s
// discovery call risks blowing maxDuration and returning nothing at all. A
// short list beats a timeout.
const BROADEN_DEADLINE_MS = 20_000;

// Fewer than this many ranked jobs is a thin deliverable worth one more attempt.
// Two is the floor the spec commits to; below it the section barely earns its
// space in a paid report.
const THIN_RESULT_FLOOR = 3;

// The thin retry runs AFTER discovery and the first rank, so it starts later
// than the broaden check above and needs its own, later ceiling. Budget: intent
// (~2s) + discovery (~11s) + rank (~4s) ≈ 17s to reach here, then another
// ~11s + ~4s — comfortably inside maxDuration at 60s.
const THIN_RETRY_DEADLINE_MS = 30_000;

const TEXT_HARD_CAP = 20_000;

// Haiku, not Sonnet. Both calls here are structured work over already-parsed
// data — pulling search terms out of a résumé, and scoring pre-filtered job
// records against it. Neither writes prose the user reads, so the Sonnet
// premium buys nothing. See docs/jobs-feed-spec.md §4.
const JOBS_MODEL = process.env.JOBS_MODEL ?? "claude-haiku-4-5-20251001";
const INTENT_MAX_TOKENS = 400;
const RANK_MAX_TOKENS = 900;

const JOBS_ENABLED = process.env.JOBS_ENABLED !== "false";

// Discovery results are cached by search intent, not by user. "Frontend
// Engineer, Bangalore" repeats across hundreds of résumés, and this cache is
// the only thing standing between the feature and its free-tier ceiling —
// Firecrawl and Firecrawl-adjacent vendors bill cache hits, so the savings have
// to happen here (spec §2.4).
const CACHE_SECONDS = 12 * 60 * 60;

const jobsSchema = {
  text: vString({ trim: true, min: 40, max: TEXT_HARD_CAP }),
  targetRole: vString({ optional: true, trim: true, max: ROLE_CHAR_CAP }),
  passToken: vString({ optional: true, max: 4096 }),
};

function payload(jobs: Job[], extra: Partial<JobsPayload> = {}): NextResponse {
  return NextResponse.json({
    jobs,
    fetchedAt: new Date().toISOString(),
    ...extra,
  } satisfies JobsPayload);
}

function intentKey(intent: JobIntent): string {
  return [
    intent.role.toLowerCase().replace(/\s+/g, "-"),
    intent.location.toLowerCase().replace(/\s+/g, "-") || "any",
    intent.seniority.toLowerCase(),
  ].join(":");
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  if (!JOBS_ENABLED) return payload([], { degraded: "disabled" });

  const parsed = await parseJsonBody(req, jobsSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  }
  const body = parsed.value;
  const text = body.text.slice(0, INPUT_CHAR_CAP);

  if (!jobsConfigured) return payload([], { degraded: "not_configured" });

  // Gating mirrors the Glow-Up route. A valid Pass, or a receipt proving this
  // exact résumé just received a Glow-Up, gets the loose authenticated ceiling;
  // anyone else falls to the per-IP limit so the endpoint can't be used as a
  // free job-search API against our quota.
  const pass = verifyToken(body.passToken);
  const entitled = !!pass || (await hasGlowupReceipt(text));
  if (entitled) {
    const burst = await limitUser(pass?.code ?? "receipt:" + ipFrom(req), "jobs");
    if (!burst.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: burst.retryAfter },
        { status: 429, headers: { "retry-after": String(burst.retryAfter) } },
      );
    }
  } else {
    const { allowed } = await checkAndIncrement(ipFrom(req));
    if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (!(await budgetAvailable())) return payload([], { degraded: "quota" });

  // ---- 1. What are we actually searching for? ----
  let intent: JobIntent;
  try {
    const res = await callClaude(
      buildIntentPrompt(body.targetRole) + "\n\nRÉSUMÉ:\n" + text,
      { apiKey: "", model: JOBS_MODEL, maxTokens: INTENT_MAX_TOKENS },
    );
    await recordSpend(res.model, res.usage);
    const raw = parseRoastJSON<Partial<JobIntent>>(res.text);
    if (!raw?.role) {
      console.error("[jobs] intent returned no role:", res.text.slice(0, 200));
      return payload([], { degraded: "no_results" });
    }
    intent = {
      role: String(raw.role).slice(0, 120),
      seniority: String(raw.seniority ?? "").slice(0, 24),
      stack: Array.isArray(raw.stack)
        ? raw.stack.filter((s): s is string => typeof s === "string").slice(0, 6)
        : [],
      location: String(raw.location ?? "").slice(0, 80),
      remoteOk: raw.remoteOk !== false,
      years: Number.isFinite(Number(raw.years)) ? Number(raw.years) : 0,
    };
  } catch (err) {
    console.error("[jobs] intent failed:", err instanceof Error ? err.message : err);
    return payload([], { degraded: "no_results" });
  }

  // ---- 2. Cached results for this intent? ----
  const redis = getRedis();
  const cacheKey = `burntcv:jobs:${intentKey(intent)}`;
  let pool: Job[] = [];
  let broadened = false;

  if (redis) {
    try {
      const raw = await redis.get<string>(cacheKey);
      if (raw) {
        const hit = JSON.parse(raw) as { jobs: Job[]; broadened?: boolean };
        // Cached jobs still have to pass the freshness gate — a 12h-old cache
        // entry can contain a posting that has aged out of the 7-day window.
        pool = (hit.jobs ?? []).filter((j) => usable(j, hit.broadened ? BROADEN_DAYS : FRESH_DAYS));
        broadened = !!hit.broadened;
      }
    } catch {
      /* a cold cache is not an error */
    }
  }

  // ---- 3. Discovery ----
  if (!pool.length) {
    let found = await discover(intent, false);
    pool = dedupe(found).filter((j) => usable(j, FRESH_DAYS));

    // Thin result — broaden once rather than showing an empty column. Niche
    // stacks and tier-2 cities hit this legitimately, and the UI says so.
    if (pool.length < 3 && Date.now() - startedAt < BROADEN_DEADLINE_MS) {
      found = await discover(intent, true);
      const wide = dedupe([...pool, ...found]).filter((j) => usable(j, BROADEN_DAYS));
      if (wide.length > pool.length) {
        pool = wide;
        broadened = true;
      }
    }

    if (!pool.length) return payload([], { degraded: "no_results" });

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify({ jobs: pool, broadened }), {
          ex: CACHE_SECONDS,
        });
      } catch {
        /* best effort */
      }
    }
  }

  // ---- 4. Rank against the résumé ----
  // Cap what goes to the model: 30 records is plenty to pick 5 from, and keeps
  // the input token cost flat regardless of how much a source returned. The
  // per-publisher cap runs first so a single content farm can't fill the
  // shortlist before the ranker ever sees an alternative.
  const rank = async (from: Job[], wide = false): Promise<Job[]> => {
    const candidates = capPerPublisher(from, 3).slice(0, 30);
    const picked: Job[] = [];
    try {
      const prompt =
        buildRankPrompt(intent, MAX_JOBS, wide) +
        "\n\nPOSTINGS:\n" +
        jobsForRanking(candidates) +
        "\n\nRÉSUMÉ:\n" +
        text;
      const res = await callClaude(prompt, {
        apiKey: "",
        model: JOBS_MODEL,
        maxTokens: RANK_MAX_TOKENS,
      });
      await recordSpend(res.model, res.usage);
      const picks = parseRoastJSON<{ picks?: { id?: string; why?: string }[] }>(res.text)?.picks;
      if (Array.isArray(picks)) {
        const byId = new Map(candidates.map((j) => [j.id, j]));
        for (const p of picks) {
          const job = p?.id ? byId.get(String(p.id)) : undefined;
          if (!job || picked.some((r) => r.id === job.id)) continue;
          picked.push({
            ...job,
            matchReason: sanitizeMatchReason(
              String(p.why ?? "").slice(0, 220),
              job.location,
              intent.location,
            ),
          });
          if (picked.length >= MAX_JOBS) break;
        }
      }
    } catch (err) {
      console.error("[jobs] ranking failed:", err instanceof Error ? err.message : err);
    }
    // Ranking is an enhancement, not a gate. If it fails or returns nothing
    // usable, fall back to freshest-first — a real list with no "why" beats an
    // empty column.
    if (!picked.length) {
      return [...candidates]
        .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
        .slice(0, MAX_JOBS);
    }
    return picked;
  };

  let ranked = await rank(pool, broadened);

  // A thin list can survive a healthy pool: the ranker is instructed to drop
  // wrong-kind-of-work and weak matches rather than pad, so a career changer or
  // a niche title can pass the pool check and still come out with one result.
  // That's honest but it isn't much of a deliverable, so widen the net once and
  // re-rank. Only for genuinely thin outcomes, and only if there's time left —
  // this costs a second ~11s discovery call plus a re-rank.
  if (
    ranked.length < THIN_RESULT_FLOOR &&
    !broadened &&
    Date.now() - startedAt < THIN_RETRY_DEADLINE_MS
  ) {
    try {
      const extra = await discover(intent, true);
      const widened = dedupe([...pool, ...extra]).filter((j) => usable(j, BROADEN_DAYS));
      if (widened.length > pool.length) {
        const reranked = await rank(widened, true);
        // Only take the wider result if it actually did better. A broadened
        // search that returns the same or fewer jobs isn't worth relabelling
        // the section "last 30 days" for.
        if (reranked.length > ranked.length) {
          ranked = reranked;
          pool = widened;
          broadened = true;
          if (redis) {
            try {
              await redis.set(cacheKey, JSON.stringify({ jobs: pool, broadened }), {
                ex: CACHE_SECONDS,
              });
            } catch {
              /* best effort */
            }
          }
        }
      }
    } catch (err) {
      console.error("[jobs] thin retry failed:", err instanceof Error ? err.message : err);
    }
  }

  // The snippet was only ever for the ranking prompt — don't ship it to the client.
  const out = ranked.map(({ snippet: _snippet, ...j }) => j);
  return payload(out, broadened ? { broadened: true } : {});
}
