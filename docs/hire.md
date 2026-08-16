# BurntCV Hire — AI Recruiting module

The recruiter-side sibling of the roast product. A recruiter pastes a job
description and candidates' résumés; Hire returns an explainable,
evidence-cited fit report — per-requirement scores, gaps, and targeted
interview questions — with a human making every final call.

Surfaces: `/hire` (landing) · `/hire/app` (workspace) · `/hire/privacy`
(distinct data promise) · `Product ▾` in the nav switches between the
products.

The same engine also powers the candidate-side product, **BurntCV Pro**
(`/pro`, [docs/pro.md](./pro.md)) — stateless, sold to the roast audience.
Sequencing: Pro is the wedge (owned audience, zero compliance overhead), Hire
is the expansion (recruiter market). One engine, two wrappers.

## The one decision everything follows from

**The LLM extracts and rates evidence; deterministic code produces the
verdict.** The model is never asked "score this candidate 0–100." It is only
ever asked to (a) structure text and (b) rate one requirement at a time
against a fixed 0–4 rubric, citing verbatim résumé spans. The overall score is
a weighted mean computed in [`lib/hire/engine.ts`](../lib/hire/engine.ts) —
pure code, recruiter-confirmed weights, versioned thresholds
(`hire-engine/1.0.0` stamped on every report). Same input → same verdict:
that's what makes reports reproducible and defensible in an audit.

## Pipeline

```
JD text ──decompose (Sonnet)──▶ draft weighted requirements
                                   │  recruiter edits weights/categories,
                                   ▼  confirms knockouts   ← THE HUMAN GATE
résumé ──extract (Haiku)──▶ structured facts + verbatim evidence spans
        ──rate (Sonnet)───▶ per-requirement 0–4 + supporting/contradicting quotes
        ──engine (code)───▶ weighted score · band · knockout flags · confidence
        ──questions (Sonnet)▶ 3–5 gap-targeted interview questions
                                   │
                                   ▼
        recruiter records ADVANCE / HOLD / PASS  ← the only path that decides
```

Stages advance one per `POST /api/hire/candidates/:id/process` call (the
client loops until done), so every hop fits a serverless timeout without queue
infrastructure. Any stage failing after retry routes the candidate to
`review` — flagged for a human, never silently dropped, never guessed.

Rules enforced in code, not prompts:

- A rating ≥ 1 with no cited evidence is invalid → sanitized to N/A with zero
  confidence (`sanitizeDimensions`).
- N/A dimensions are excluded from the mean, not zeroed.
- Knockouts can only be set by the recruiter's confirm call — the AI merely
  suggests. Knockout failures are surfaced, never auto-actioned.
- No code path writes a decision without a verified recruiter session; the
  decision route is the only writer.

## Files

| Piece | Where |
|---|---|
| Types (schemas §7–12 of the PRD) | `lib/hire/types.ts` |
| Data plane (tenant-scoped KV) | `lib/hire/store.ts` |
| Auth (magic link + sessions) | `lib/hire/auth.ts` |
| Prompt contracts | `lib/hire/prompts.ts` |
| JSON LLM caller (direct, temp-pinned) | `lib/hire/llm.ts` |
| Deterministic verdict | `lib/hire/engine.ts` |
| Stage orchestration | `lib/hire/pipeline.ts` |
| Limits + retention config | `lib/hire/config.ts` |
| API routes | `app/api/hire/**` |
| Workspace UI | `components/hire/HireConsole.tsx` |
| Landing / privacy | `components/hire/HireLanding.tsx`, `app/hire/privacy/` |
| Engine tests | `tests/hire-engine.test.mjs` (`npm run test:hire`) |

## Tenancy & the roast firewall

Hire stores candidate data (it must); the roast stores nothing (it promises
not to). Both stay true because the products are walled:

- All Hire data lives in the `hire:` Redis keyspace; every key embeds the
  owning `accountId`, and every store function takes the accountId from a
  verified session — cross-tenant reads are impossible by construction
  (verified: cross-tenant fetch → 404, no/tampered token → 401).
- No roast code imports `lib/hire/*`; no Hire code touches roast data. No
  résumé crosses in either direction.
- Sessions are HMAC-signed with a Hire-scoped prefix — a roast Pass token can
  never open a Hire session.

The store is deliberately one module: swapping Upstash for Postgres/Supabase
with RLS later (the PRD's target for scale) means reimplementing
`lib/hire/store.ts` and nothing else.

## Compliance (DPDP-first, v0 — not bolted on later)

- **Consent attestation** required at intake (basis + attesting recruiter +
  timestamp, kept on the record and in the audit trail).
- **Purpose limitation**: `role_screening` only; no cross-role reuse.
- **Retention**: every candidate carries `purgeAfter` (default 180 days,
  account-configurable 7–365). Enforced twice — a storage TTL on the record
  and a lazy filter on read.
- **Rights**: one-click JSON export per candidate (access), hard delete per
  candidate / per role / whole account (erasure), all audit-logged.
- **Human-in-the-loop**: decisions carry the recruiter's identity; the audit
  trail shows scorer (system) and decider (human) separately.

## Ops notes

- Uses the same `ANTHROPIC_API_KEY` and Upstash Redis as the roast; recruiter
  sign-in emails go through the existing Resend key. Without Resend (local
  dev), the sign-in link is returned inline and the UI completes it
  automatically.
- Hire LLM calls always go **direct to Anthropic** (never the AI Gateway) with
  temperature pinned where the model supports it — one fewer variable between
  "same input" and "same output". Claude 5-family models reject `temperature`;
  `lib/hire/llm.ts` adapts at runtime.
- Models per stage are env-swappable (`HIRE_MODEL_*`), defaults:
  Sonnet 5 for decompose/rate/questions, Haiku 4.5 for extraction.
- Pilot limits are config-driven (`HIRE_MAX_ROLES`,
  `HIRE_MAX_CANDIDATES_PER_ROLE`, `HIRE_SCREENS_PER_MONTH`) — exact tiers and
  ₹ numbers are still open (PRD §24); nothing is hard-coded to a plan.

## Pricing model — monthly subscription (decided direction)

Hire is the suite's recurring-revenue product, and **monthly subscription is
the right model here** — recruiters screen candidates every month,
continuously; this is an ongoing workflow tool, and seats + screening volume
is textbook SaaS. The existing metering unit (candidate-screens per month,
already counted by `consumeScreen`) maps directly onto subscription tiers.

The deliberate contrast: the candidate-side product (Pro) must NOT charge
monthly — job seekers are active 4–8 weeks and churn on success, so Pro
charges per-use or a short time-window pass instead (full reasoning in
[docs/pro.md](./pro.md)). Sequencing follows from that: Pro earns first on the
owned audience with churn-proof pricing; Hire's monthly subscriptions come
once the engine is battle-tested and revenue proves the concept.

## Not in v0 (deliberate)

Batch/unattended ranking, candidate sourcing, ATS integrations, interview
scheduling (integrate Cal.com in v2 — never build calendar infra), blind-mode
redaction (v1), PDF report export (v1), billing wiring (pending pricing
decisions). The engine is the moat; scheduling and volume are not.
