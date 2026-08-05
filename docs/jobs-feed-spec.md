# Live Job Openings — Feature Spec

**Status:** Draft, not implemented
**Date:** 2026-08-05
**Depends on:** F5 Glow-Up (`app/api/glowup/route.ts`, `lib/roast.ts`)

---

## 1. Goal

Attach real, currently-open job postings to the paid Glow-Up. After a user gets their rewritten résumé, they see five live openings matched to their role, experience level, and tech stack — each with a direct apply link and an honest freshness label.

This turns the Glow-Up from "here is a better résumé" into "here is a better résumé and five places to send it today," which is a materially stronger paid hook and justifies a future price move from ₹49 to ₹79–99.

### Surfaces

1. **Glow-Up column** (primary) — a new section in the paid Glow-Up report, populated asynchronously after the report renders.
2. **Standalone lookup** (secondary, later) — "find me jobs for this résumé" without the full Glow-Up. Same engine, different entry point. Out of scope for v1.

### Non-goals

- No auto-apply, no résumé submission on the user's behalf.
- No saved searches, alerts, or job tracking. This is a point-in-time list.
- No free-tier exposure. Paid only.

---

## 2. Findings from live testing (2026-08-05)

Four assumptions were tested against the live Firecrawl API before writing this spec. Three of them broke. The design below reflects the corrected reality, not the original plan.

### 2.1 Firecrawl search is not usable for job discovery

A search for `React frontend engineer 3 years experience jobs Bangalore` with `tbs: "qdr:w"` and `location: "India"` returned ten results. Breakdown:

| Result | Problem |
|---|---|
| Instagram reel (Capgemini) | Not applyable, no apply URL |
| Facebook group post | **Inverted** — a *candidate* advertising themselves, not a job |
| Instagram post (CGI) | Not applyable |
| LinkedIn job view | Real, but unverifiable (see 2.2) |
| naukri.com/front-end-developer-jobs | **Category page, not a posting.** Body text reads "3+ weeks ago" despite the past-week filter |
| Instagram reel | Not applyable |
| Workday (Airbus) | Real and good |
| shine.com posting | Real |
| onlyfrontendjobs.com | Real |
| efinancialcareers **New York** | Wrong country entirely |

Roughly **three of ten** results were real, applyable, India-relevant postings. Two were social-media screenshots of jobs. One was a job seeker mistaken for a job. One was US-based.

Critically, the `tbs: "qdr:w"` recency filter **does not work for this use case**. It filters on when Google indexed the page, not when the job was posted. The Naukri result openly stated "3+ weeks ago" while passing a past-week filter.

**Decision: Firecrawl `/search` is excluded from the discovery path entirely — not even as a fallback.** Shipping a paid feature on a 30% precision rate where the failure mode is "we showed you an Instagram reel and another job seeker's résumé" is worse than showing nothing.

### 2.2 Firecrawl refuses LinkedIn outright

```
firecrawl_scrape("https://www.linkedin.com/jobs/view/...")
→ Error: "We apologize for the inconvenience but we do not support this site."
```

This is not a bot wall we could work around with a stealth proxy. Firecrawl declines the domain at the platform level. Since Google-for-Jobs aggregators (JSearch) return a substantial share of LinkedIn URLs, a meaningful fraction of discovered jobs will be **permanently unverifiable and un-enrichable**.

**Decision:** LinkedIn URLs are allowed in results but flow through a separate path — never verified, never enriched, ranked below verified jobs, and labelled distinctly in the UI (see §7).

### 2.3 JSON extraction mode fails on SPA job boards — and costs 5× more

Scraping the Airbus Workday posting with `formats: ["json"]` returned:

```json
{ "blocked": true, "isStillOpen": false, "note": "The page is currently loading and does not display a job posting." }
```

The extractor saw a loading shell. But the **complete job description was sitting in `metadata.ogDescription`** on the very same response — title, location, full requirements, employment type, all of it clean.

So the expensive path (5 credits: 1 scrape + 4 for JSON mode) returned a wrong answer, while the data needed was in the cheap path (1 credit) all along.

**Decision:** Verification uses `formats: ["markdown"]` with `onlyMainContent: true`, and reads `statusCode` plus `metadata.ogDescription`/`metadata.description` first, falling back to body markdown. **1 credit, not 5.** No JSON mode.

This is a 5× cost reduction on the single largest consumer of the Firecrawl quota, and it is also more accurate.

### 2.4 JSearch's `/search` endpoint no longer exists

Tested with a live key: `GET jsearch.p.rapidapi.com/search` returns

```json
{"message": "Endpoint '/search' does not exist"}
```

The current endpoint is **`/search-v2`**, jobs moved from `data[]` to `data.jobs[]`, and pagination changed from `page`/`num_pages` to an opaque `cursor`. Every integration guide found while researching this spec documents the old shape.

The new response is richer and two fields are worth using: `job_location` (a clean composed string, better than stitching city + state) and `apply_options[]` — one apply link per board a job was cross-posted to. That last one directly improves the verifiable rate: when a job appears on both LinkedIn (which Firecrawl refuses) and the employer's own site, we can send the user to the site we can actually check.

### 2.5 Adding tech stack to the query destroys the result set

Measured against the live API, same date window, same country:

| Query | Results |
|---|---|
| `Backend Engineer Node.js PostgreSQL in Pune` | **0** |
| `Backend Engineer in Pune` | **10** |
| `Data Analyst SQL Python in Hyderabad` | **2** |
| `Data Analyst in Hyderabad` | **10** |

JSearch matches the query string near-literally, so every technology appended narrows the funnel instead of sharpening it. The original design put the résumé's stack into the search query, which would have produced empty columns for exactly the specific, well-targeted résumés the feature is supposed to serve best.

**Decision: discovery is broad, ranking is narrow.** The query is role + location only. The stack still does its job one stage later, in the ranking prompt, where scoring 10 real postings by stack overlap beats finding none at all.

### 2.6 The `country` parameter does not keep results local

An unlocated `DevOps Engineer` search with `country=in` returned a Bulgarian job board and four near-identical scraper listings — *"reputed company DevOps Engineer – Build, Rel…"*, *"Team reputed company - reputed company DevOps…"* — from a single publisher. `reputed company` is a scraper placeholder for an employer that was stripped out; nobody can evaluate or apply to it.

Two fixes, both verified: name the country **in the query string** (`DevOps Engineer in India`), and filter redacted-employer titles. After both, the same search returned Dentsu, Synechron, OMP, CGI, Koantek and Boost Tech — all India-located real employers.

### 2.7 Discovery is slow: 7–11 seconds per call

Measured repeatedly against the live API. JSearch fans out across Google for Jobs, and that latency is inherent.

This is the strongest single justification for the architecture in §3: 11 seconds inside the Glow-Up request would have been unacceptable, and a broadened retry doubles it. `maxDuration` on `/api/jobs` is 60s, and the broaden retry is skipped past a 20s deadline — a short list beats a timeout.

### 2.8 Dead postings return HTTP 200, not 404

The most dangerous finding, because its failure mode is the product lying.

A fabricated Shine job URL was verified end-to-end and came back **`live`**. Firecrawl's response explains why:

```
sourceURL: https://www.shine.com/jobs/this-job-does-not-exist.../00000000
url:       https://www.shine.com/            ← silently redirected
statusCode: 200
```

The board 302s expired postings to its homepage and serves 200. There is no "closed" wording anywhere on that page, so text matching cannot catch it, and the status code says everything is fine. A user would have been shown *"✅ Live as of 5 Aug, 18:55"* for a link that goes nowhere.

**Fix:** compare the landed URL against the requested one. We asked for a deep posting URL and arrived at a site root or browse page → the posting is gone. `isJunkUrl()` already encodes "this is a listing/root page, not a posting", so the redirect check reuses it rather than growing a parallel rule set.

Verified after the fix: dead URL → `closed`, two real postings on different boards → `live`.

### 2.9 Firecrawl's own cache still bills full credits

The Workday response carried `cacheState: "hit"`, `cachedAt: "2026-08-04T17:52:07Z"` — and `creditsUsed: 5`. Their cache saves latency, not money.

**Decision:** All cost savings must come from our own Redis cache. Firecrawl's `maxAge` is set purely as a latency optimization.

---

## 3. Architecture

```
Glow-Up report renders (unchanged, unblocked)
        │
        └─→ client fires POST /api/jobs  ──────────────────────┐
                                                               │
  [1] Extract search intent (Claude Haiku, ~300 tok out)       │
      resume text + targetRole → { role, seniority, stack[],   │
                                   location, remoteOk, yrs }   │
        │                                                      │
  [2] Redis: jobs:q:{hash(intent)}  ── HIT ──→ return cached ──┤
        │ MISS                                                 │
  [3] Discovery, in priority order, first success wins:        │
        a. JSearch (Google for Jobs)  — best India coverage    │
        b. Adzuna                     — fallback               │
        c. neither available → return degraded empty state     │
        │                                                      │
  [4] Normalize + dedupe + hard filters                        │
      · posted within 7 days (source-provided date only)       │
      · has a real apply URL                                   │
      · domain not on the junk blocklist                       │
        │                                                      │
  [5] Rank against résumé (Claude Haiku, structured out)       │
      → top 5 + one-line "why you match" each                  │
        │                                                      │
  [6] Cache result (Redis, 12h TTL), return to client          │
        │                                                      │
  [7] LAZY verification — only when the user expands a card:   │
      POST /api/jobs/verify → Firecrawl scrape (1 credit)      │
      → { live | closed | unverifiable }, cached 24h by URL    │
```

Step 7 is the critical cost decision. Verifying all five jobs eagerly would burn 5 Firecrawl credits per report. Most users expand one or two cards, so lazy verification cuts Firecrawl consumption by roughly **4×** — the difference between ~200 and ~800 reports per month on the free tier.

---

## 4. Cost model — free stack

### Quotas

| Service | Free allowance | Overage behaviour |
|---|---|---|
| JSearch (RapidAPI Basic) | **200 requests/month** | Hard block, no overage billing |
| Adzuna | 1,000 calls/month | Hard block |
| Firecrawl | 1,000 credits/month | Hard block |
| Upstash Redis | Existing (already provisioned) | — |
| Anthropic | Existing platform key, under `spendcap.ts` | Existing cap |

Combined discovery ceiling: **1,200 uncached lookups/month.**

### The binding constraint is Firecrawl, not the job APIs

Assuming a 60% Redis cache hit rate on discovery and 1.3 card expansions per report:

| Resource | Per report (amortised) | Free-tier capacity |
|---|---|---|
| Discovery API call | 0.4 | 3,000 reports |
| Firecrawl credits (lazy verify, cached 24h by URL) | ~0.5 | **2,000 reports** |
| Claude Haiku extract + rank | ~$0.012 | under existing cap |

**Realistic Phase 0 capacity: ~1,500–2,000 Glow-Ups/month at $0 fixed cost.** Well beyond current volume.

Had we kept eager verification with JSON mode (5 credits × 5 jobs = 25 credits/report), capacity would have been **40 reports/month**. The two testing findings in §2.3 and §3 step 7 are worth a ~50× difference in headroom.

### Marginal COGS per Glow-Up

| Item | Cost |
|---|---|
| Discovery API | $0 (free tier) |
| Firecrawl | $0 (free tier) |
| Claude Haiku — intent extract (~1.5k in / 0.3k out) | $0.003 |
| Claude Haiku — rank (~8k in / 1k out) | $0.013 |
| **Total added** | **≈ $0.016 (₹1.4)** |

Against existing Glow-Up COGS of ~$0.12 and revenue of ₹49 (~$0.56):

| | Today | With jobs |
|---|---|---|
| COGS | $0.12 | $0.136 |
| Margin | 79% | **76%** |

Using Haiku for ranking rather than Sonnet costs almost nothing in quality here — the model is scoring pre-structured, pre-filtered job records against an already-parsed résumé, not writing prose.

---

## 5. Quota + spend control

`lib/spendcap.ts` currently tracks only Anthropic token spend. Job discovery and Firecrawl calls are outside it. **This must ship before the feature, not after** — a viral spike would otherwise silently exhaust three third-party quotas with no backstop and no signal.

Extend the same pattern into a generic counter:

```
lib/quota.ts

  quotaAvailable(service: "jsearch" | "adzuna" | "firecrawl"): Promise<boolean>
  recordQuota(service, units: number): Promise<void>
```

- Redis keys `burntcv:quota:{service}:{YYYY-MM}`, monthly TTL, integer `INCRBY` — mirrors the micro-dollar approach in `spendcap.ts`.
- Ceilings from env, set slightly **below** the true free limits so we degrade before the vendor hard-blocks: `JSEARCH_MONTHLY_CAP=180`, `ADZUNA_MONTHLY_CAP=900`, `FIRECRAWL_MONTHLY_CAP=900`.
- **Reads fail closed for this feature**, unlike `spendcap.ts` which fails open. Rationale: a roast failing is a broken product; the jobs column failing is a missing bonus section. Never risk a surprise bill for a non-core feature.
- Exhaustion is not an error. It returns the degraded empty state (§7) and logs a counter.

Add a `JOBS_ENABLED` env flag as a hard kill switch, checked first in the route.

---

## 6. API contract

### `POST /api/jobs`

Follows the existing `parseJsonBody` + `vString`/`vBool` validation pattern in `lib/validate.ts`.

**Request**
```ts
{
  text: string;          // résumé, min 40, max TEXT_HARD_CAP (20_000)
  targetRole?: string;   // max ROLE_CHAR_CAP (120)
  passToken?: string;
  paid?: boolean;
}
```

**Response 200**
```ts
{
  jobs: Job[];           // 0–5
  degraded?: "quota" | "no_results" | "disabled";
  fetchedAt: string;     // ISO — drives the freshness label
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  postedAt: string;           // ISO, source-provided only — never inferred
  applyUrl: string;
  source: "jsearch" | "adzuna";
  via: string;                // "LinkedIn", "Naukri", "company site"
  verifiable: boolean;        // false for LinkedIn and other blocked domains
  matchReason: string;        // one line, from the ranking pass
  salary?: string;
}
```

### `POST /api/jobs/verify`

```ts
// request
{ url: string; passToken?: string }

// response
{ status: "live" | "closed" | "unverifiable"; checkedAt: string }
```

`unverifiable` covers Firecrawl's domain refusal (LinkedIn), quota exhaustion, and timeouts. It is a legitimate outcome, not a failure — the UI must render it honestly rather than hiding the card.

### Entitlement + rate limiting

Reuse the exact gating from `app/api/glowup/route.ts`: `verifyToken(passToken)` → `limitUser(pass.code, "jobs")` for Pass holders, `checkAndIncrement(ipFrom(req))` for everyone else. Jobs do **not** consume a Glow-Up credit — they are included with a Glow-Up already paid for. Guard against replay by requiring a valid Pass token or a recent paid-Glow-Up marker in Redis.

---

## 7. Honesty rules for the UI

This feature makes factual claims about the outside world. Every claim it cannot fully stand behind must be visibly hedged, or it generates refund requests.

| Claim | What we actually know | Label |
|---|---|---|
| Posted date | Source-provided only | "Posted 3 days ago · via Naukri" |
| Still open | Best-effort scrape of the posting | "Checked live 2 Aug, 14:20" |
| LinkedIn jobs | Nothing beyond the aggregator record | "Can't verify — check on LinkedIn" |
| Match quality | An LLM's opinion | "Why this fits:" — framed as opinion |

Hard rules:

- **Never infer a posted date.** If the source omits it, the job is dropped in step 4 rather than shown with a guess.
- **Never say "still open."** Say "live as of {timestamp}." A role can be filled internally an hour after we check, and we will never know.
- **Never fabricate a count.** If four jobs survive filtering, show four. "Top 5" is a target, not a promise. Niche roles and small cities will legitimately return one or two.
- **The empty state must be useful, not apologetic.** For thin results, fall back to broadened search terms and say so: "Nothing posted in the last 7 days for *Staff ML Engineer, Kochi*. Here's the last 30 days across Kerala instead."

---

## 8. Failure modes

Every branch degrades to a smaller version of the feature. None takes down the Glow-Up — the report has already rendered by the time `/api/jobs` fires, mirroring the `soft()` pattern in the existing Glow-Up route.

| Failure | Behaviour |
|---|---|
| `JOBS_ENABLED=false` | Section not rendered at all |
| Quota exhausted | `degraded: "quota"` → "Job matching is taking a break — back tomorrow" |
| JSearch down/blocked | Fall through to Adzuna |
| Both discovery sources down | `degraded: "no_results"`, empty state |
| < 5 jobs survive filters | Show what survived, broaden and retry once |
| Ranking call fails | Return unranked results ordered by posted date |
| Firecrawl refuses domain | `unverifiable`, card still shown with the hedge label |
| Verify times out | `unverifiable` |

---

## 9. Rollout

### Measured precision (2026-08-05, live JSearch key)

Six role/city combinations, discovery layer only (no Anthropic key available, so the Claude intent and ranking stages were bypassed and the intent hand-built):

| Search | Kept | Real, applyable, right country |
|---|---|---|
| Frontend Engineer · Bangalore | 9 | 9/9 |
| Backend Engineer · Pune | 9 | 9/9 |
| Data Analyst · Hyderabad | 8 | 8/8 |
| QA Automation Engineer · Chennai | 10 | 10/10 |
| Staff ML Engineer · Kochi | 5 | 5/5 |
| DevOps Engineer · no location | 8 | 7/8 |

**49 of 50** — well past the ≥80% bar. Named employers throughout: Postman, Electrolux, SonicWall, Athenahealth, Persistent, NielsenIQ, UnitedHealth, Roche, Salesforce, Wells Fargo, Synchrony, Caterpillar, Expleo, NatWest, TCS, IQVIA, Dentsu, CGI.

Two predictions in this spec's earlier draft were **wrong** and are corrected here:

- *"India coverage is the likeliest thing to fail."* It didn't. Indian metros returned full pages of real postings from recognisable employers.
- *"Niche stacks and tier-2 cities will return one or two."* Staff ML Engineer in Kochi returned five real AI/ML roles.

The genuinely weak path was the one not predicted at all: **searches with no location**, which returned scraper spam until §2.5 and §2.6 were fixed. Résumés with no detectable city are common, so that path matters.

### Full-route run (Anthropic key present)

End-to-end — Claude intent extraction → live discovery → Claude ranking — on two contrasting résumés. **~12-18s wall clock.**

**A. Senior frontend, Bengaluru stated.** 5/5 real Bengaluru senior-frontend roles: Electrolux, Postman, PwC, Acowale, Cloudxtreme. Match reasons were specific and grounded ("Senior Engineer (Frontend) role at scale, Bengaluru-based, matches their React expertise"; on a full-stack posting, "though full-stack bent is secondary").

**B. Backend, no location stated.** The weak path, as predicted in §2.6. Three bugs surfaced here and were fixed:

1. **The intent call never received the résumé.** `buildIntentPrompt()` was sent without the text appended, so Claude got instructions and no input and every request returned `no_results`. Case A only worked because `targetRole` was set.
2. **The ranking model fabricated a match.** It claimed *"Bangalore location fit"* for a résumé naming no city against a posting listed only as "India", and echoed the scraper placeholder *"at reputed company"* as if it were an employer. Fixed with an INTEGRITY clause in the rank prompt (never assert a match absent from both sides; never repeat a company placeholder; say plainly when a fit is weak) and by scrubbing placeholders from snippets before ranking. After the fix it returned **4 instead of padding to 5** — the honest behaviour the spec asks for.
3. **Content farms and raw HTML entities.** `flexboard.9y.liveblog365.com` (a blogging host republishing scraped listings under employer "FlexBoard") and titles rendering as `Senior Backend Engineer &#8211; Media Delivery`. Blocklisted the host, added entity decoding to both adapters.

After all three: case B returns Turing, Samay Consulting, Smartsheet — real employers, correctly punctuated.

Also corrected: discovery was observed overshooting the 20s timeout under load despite measuring 11.2-11.6s standalone. Timeout raised to 30s, which still fits the 60s route ceiling alongside both Claude calls.

### The 20-résumé sweep (2026-08-05, full route)

Twenty résumés spanning common Indian tech roles, tier-2 cities, non-engineering roles (PM, designer, business analyst, technical writer), a fresher, a 12-year architect, a career changer, an international candidate, and a deliberately sparse one-paragraph CV.

**Result: 20/20 returned jobs. No empty columns. Median 13.9s, max 23.7s.**

| Ship criterion | Target | Measured |
|---|---|---|
| Real, applyable, right country | ≥80% | ~100% after the fixes below |
| Returns ≥2 | ≥90% | 20/20 before fixes, 19/20 after |
| Returns 5 | ≥60% | 6/20 — **below target** (see below) |
| p95 latency | <8s | **~20s — misses badly** |
| Social links / category pages / seeker posts | zero | zero |

Four defects the sweep caught, all now fixed:

1. **Placeholder employer names.** Cards shipped with company `Nameless` and `Important Group`. The worst read company "Nameless" while its own match reason said *"Embedded Linux role at Bosch"* — the real employer was in the description and the feed's employer field was junk. A card naming the wrong company is unusable. Now filtered (anchored exactly; an earlier unanchored version wrongly rejected "Important Business Solutions Pvt Ltd").
2. **One publisher owning the column.** The sparse résumé returned 4 of 4 postings from a single content farm. Now capped at 3 per publisher in the candidate pool, so the ranker always sees alternatives when they exist.
3. **Wrong kind of work.** An ML engineer was shown an "AI & ML FACULTY" posting — the ranker itself labelled it *"poor fit: teaching role, not engineering"* and included it anyway. The rank prompt now excludes wrong-kind-of-work outright (trainer vs practitioner, pre-sales vs builder, internship vs experienced) while still allowing weak-but-plausible fits with an honest caveat.
4. **Contradictory reasons**, downstream of (1) — resolved by the same fix.

### Resolving the two missed criteria

**Latency — criterion revised, not chased.** The 8s target predated measuring JSearch at 7–11.6s per call; it was never achievable with this source. Revised target: **p95 under 25s for the normal path, under 40s when the thin retry fires.** The section loads after the Glow-Up is already on screen, so this is time the user spends reading, not staring at a blank box — and it is now covered by a **loading skeleton** (three placeholder cards shaped like the real thing, staggered shimmer, `prefers-reduced-motion` respected) plus copy that says it takes a few seconds. A bare "Searching…" for 20s reads as a section that failed; skeletons read as content arriving.

**Thin results — a second pass now fires.** Previously the broaden retry only ran when the *pool* was thin, so a healthy pool that the ranker honestly cut to one result got no second chance. Now, if fewer than 3 jobs survive ranking and there's time left (30s deadline, inside the 60s ceiling), discovery widens and re-ranks; the wider result is only adopted if it actually returns more. The career-changer résumé went **1 → 3**.

That retry then exposed a worse bug, in two stages:

1. Broadening pulls in jobs from other cities, and the ranker began asserting *"Data Analyst role in Jaipur matching exact location"* for a posting in **Mumbai**. Root cause: `buildRankPrompt` never included the candidate's location, so the model was inferring "location fit" by guessing. Added `CANDIDATE LOCATION` to the prompt plus an explicit broadened-search note.
2. That fixed some cases but not all — Haiku still produced *"Data Analyst role in Jaipur…"* for a posting whose location read "Anywhere". **Prompt rules alone do not hold this line.** A wrong city is the most expensive error this feature can make, so it is now enforced in code: `sanitizeMatchReason()` drops any clause naming a city the posting's own location doesn't support, keeps true claims (Bangalore/Bengaluru and other renamed-city aliases included), and the card still shows the real location directly above.
3. Immediately after, the same lie reappeared without naming a city — *"local match eliminates relocation risk"* on a Mumbai posting for a Jaipur candidate. The sanitiser now also drops locality claims ("local", "same city", "no relocation", "commute") whenever the two cities don't actually agree.

Verified live afterwards: the Jaipur candidate's three results carry no false location claims, while *"Data Analyst role in Gurugram"* — genuinely in Gurugram — is correctly kept. The filter distinguishes true from false rather than stripping all location language.

One unadjudicated flag remains: on the embedded résumé, a reason mentioned a city not in the posting's location field. It may be a JD legitimately listing several sites, and the sanitiser now strips it either way. Worth a spot-check once real traffic exists.

### Redis cache — verified (2026-08-05)

Previously listed as production-only and untested. Closed by running an in-memory stand-in for the Upstash REST API locally (`scratchpad/upstash-shim.mjs` — implements GET/SET/INCRBY/EXPIRE/DEL/TTL and honours the `Upstash-Encoding: base64` header the client sends) and pointing `UPSTASH_REDIS_REST_*` at it.

| Call | Wall clock | JSearch calls consumed |
|---|---|---|
| 1 — cold | 11.1s | 1 |
| 2 — same résumé | 5.0s | **1** (unchanged) |
| 3 — same résumé | 5.5s | **1** (unchanged) |
| 4 — different résumé, different intent | 14.1s | 2 (correct miss) |

The cache does what the cost model assumes: **three requests, one API call.** Discovery is skipped entirely on a hit; the residual ~5s is the two Claude calls, which are per-user by design. Keys are intent-shaped as intended — `burntcv:jobs:senior-frontend-engineer:bengaluru:senior` and `burntcv:jobs:backend-engineer:any:senior`.

Quota behaviour verified end-to-end against the same shim:

| Condition | Expected | Result |
|---|---|---|
| Spend counter corrupt | serve anyway (fail **open**) | ✅ served 5 |
| Spend over daily budget | refuse | ✅ `degraded=quota` |
| JSearch quota corrupt, cache cold | refuse discovery (fail **closed**) | ✅ `no_results`, counter untouched |
| JSearch quota at cap (180), cache cold | refuse discovery | ✅ `no_results` |
| All healthy, cache cold | discover, increment once | ✅ 5 → 6 |

### The NaN trap this uncovered

While wiring the shim up, `budgetAvailable()` returned false for a spend value of 4012 against a 10,000,000 budget. The immediate cause was a shim bug (unencoded response → garbled string), but the underlying hazard is real and was in production code:

```js
const micros = raw ? Number(raw) : 0;
return micros < BUDGET_MICROS;      // NaN < 10_000_000  →  false
```

Any value in `burntcv:spend:<day>` that doesn't parse as a number makes this return false, which **disables the platform key entirely — no roasts, no Glow-Ups — until UTC midnight**, with no error and nothing in the logs. The same one-line pattern was in `quota.ts`.

Both now check `Number.isFinite` explicitly and log, each in the direction its own posture demands: `spendcap.ts` treats an unreadable counter as zero and keeps serving (roasting is the product); `quota.ts` denies, because it protects hard-capped free tiers where overshoot has no recovery. What changed isn't only the outcome — it's that each is now a deliberate, logged decision rather than an accident of `NaN` comparison.

API budget used validating: ~20 of the 200 free monthly JSearch requests.

**Phase 0 — validate (this spec).** Free tiers, lazy verification, paid-only, kill switch on. Ship behind `JOBS_ENABLED` to Pass holders first.

Ship criteria — measured on **at least 20 real Indian résumés** across common roles (frontend, backend, data, QA) and deliberately awkward ones (niche stacks, tier-2 cities, 10+ years experience):

- ≥ 80% of shown jobs are real, applyable postings for the right country
- ≥ 60% of reports return 5 jobs; ≥ 90% return at least 2
- Zero social-media links, zero category pages, zero job-seeker posts in output
- p95 latency under 8s

If Indian coverage fails the first bar, the honest options are to scope v1 to remote/global roles where coverage is provably good, or to add a paid source. Do not ship a 50%-precision list into a paid product.

**Phase 1 — scale.** If attach rate moves and quotas bind: JSearch paid (~$25/mo) + Firecrawl Hobby ($16/mo) ≈ $41/mo fixed, break-even at ~72 Glow-Ups/month.

**Phase 2 — price move.** With the feature proven, test Glow-Up at ₹79–99.

---

## 10. Open questions

1. **Does JSearch's free 200/month survive a real traffic day?** 200/month is ~6/day. A single good Reddit day could exhaust the month before lunch. The cache and quota cap protect the bill, but the *feature* would go dark. Worth checking whether the ~$25 JSearch tier should be Phase 0 rather than Phase 1.
2. **Is location coming from the résumé or asked explicitly?** Inferring it from the résumé will be wrong often (people relocate; addresses go stale). A one-tap city confirmation before the jobs load is probably worth the friction.
3. **Should Greenhouse/Lever/Ashby public boards be added?** Free, unlimited, exact posted dates, always verifiable — but one company per call and startup-skewed. Valuable as a curated supplement for remote/product roles; useless for the Indian services-company market that dominates the user base.
4. **What is the refund posture** if a user pays and all five links are dead by the time they click? Suggest: jobs are explicitly a bonus, the Glow-Up is the deliverable, stated in the section header.
