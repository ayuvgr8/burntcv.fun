# BurntCV Pro — the candidate-side match report

The same scoring engine as [BurntCV Hire](./hire.md), pointed the other way. A
job seeker pastes a JD + their own résumé at `/pro` and sees exactly how an AI
screener scores them against that role — per-requirement 0–4 with quoted
evidence, auto-filter warnings, and an honest fix list. "Before they screen
you, screen yourself."

## Why this exists (the sequencing call)

Candidate-side is the **wedge**; recruiter-side is the **expansion**. Same
engine powers both:

- Pro sells to the audience BurntCV already owns (48K+ roasted job seekers) as
  the natural paid upgrade from the free roast — lower-risk revenue, zero
  cold-start.
- Pro is **stateless**, so it inherits the roast's "we never store your
  résumé" promise verbatim — zero compliance overhead, zero brand conflict.
- Every Pro report exercises and validates the same decompose→extract→rate→
  aggregate engine that Hire's recruiter product runs, so the wedge proves the
  engine the expansion depends on.

It's not either/or: Hire stays live as the sub-brand for the recruiter market;
Pro is the front door on the consumer side.

## Same engine, different wrapper

| Stage | Code | Pro | Hire |
|---|---|---|---|
| JD decomposition | `lib/hire/prompts.ts` `decomposeContract` | shared | shared |
| Résumé extraction | `extractContract` + `lib/hire/extraction.ts` | shared | shared |
| Per-requirement rating | `rateContract` | shared | shared |
| Deterministic verdict | `lib/hire/engine.ts` (`hire-engine/1.0.0`) | shared | shared |
| Final stage | — | **coach fixes** (`lib/pro/prompts.ts`) | interview questions |
| Weights | AI-suggested, as-is | — | recruiter-confirmed (the human gate) |
| Knockouts | surfaced as "auto-filter risk" | — | recruiter-confirmed flags |
| State | **none** — browser carries intermediates | — | tenant store (`hire:` keyspace) |

Because Pro takes the AI's suggested weights while Hire uses the recruiter's
confirmed ones, the same résumé can score differently across the two surfaces
— that's the design, not a bug: the verdict is always "recruiter's weights ×
evidence," and on Pro the AI's draft stands in for the recruiter.

## Statelessness (the roast promise, kept)

The four stages are separate POST routes (`/api/pro/{decompose,extract,rate,
coach}`); the browser drives them in sequence and carries each stage's JSON to
the next. The server computes and forgets — no accounts, no records, no
storage of any candidate content. Round-tripped intermediates are re-sanitized
on every hop (`lib/pro/validate.ts`); tampering only skews your own report.
The only thing written anywhere is a per-IP daily counter (a number, no
content) for metering.

## Coaching honesty rules (enforced in the contract)

Every fix is labeled with a move type, and fabrication is structurally
disallowed:

- **rephrase** — the experience exists but is phrased so the screener missed
  it; rewrite grounded strictly in evidence already present.
- **add-if-true** — the résumé is silent on something the candidate may have;
  templates carry an explicit `[only if true]` placeholder.
- **gap** — genuinely missing; the advice is what closing it actually takes
  (project/cert/cover letter), never wording tricks. `exampleLine` is empty by
  contract.

## Metering & cost

- One report = ~4 model calls (~15–20k tokens). `PRO_FREE_PER_DAY` (default 2)
  per IP, consumed at `/decompose`, refunded if the chain's first stage fails.
- Burst limits per route (`limitPublic`, bucket `pro`), and every stage checks
  the platform daily spend cap (`budgetAvailable`) and records actual usage
  (`recordSpend`) — Pro can never blow past the roast's cost backstop.
- Payment wiring is pending final pricing numbers; limits are config so the
  free tier can become the paid tier's teaser without code changes.

## Pricing model — per-use or a short pass, NOT a monthly subscription

Can Pro charge monthly? Yes. Should it? No — **monthly is a trap on the
candidate side**, and this is a decided direction, not an open question.

Think about the actual behavior: a job seeker is active for maybe 4–8 weeks,
lands a job, and churns immediately — they don't need the product again for
two years. Job-seeker tools have brutal monthly churn *by design*, because
success = the user leaving. A monthly plan here means subscribe → three weeks
of use → cancel, or worse, forget → resent charge → chargeback. A subscription
business on this surface churns its way to zero.

The models that actually fit the job-search sprint:

- **Pay-per-use / credits** — a price per JD-match, or a small pack (working
  anchors: ₹49 per match, 5 matches for ₹149). Matches the impulse purchase
  and the roast audience's existing ₹49 muscle memory, and there's nothing to
  churn because there's nothing recurring.
- **Short time-window pass** — "₹299 for 7 days unlimited, while you're
  job-hunting." Priced to the length of an actual job-search sprint, not a
  perpetual subscription. (Same shape as the roast's time-boxed Pass, much
  shorter window.)

**Status: implemented — both rails.** India buys in ₹ on Razorpay; everyone
else buys in USD through Creem (Merchant of Record, tax handled). The paywall
geo-routes exactly like the roast: `/api/geo` → India sees the three ₹ cards,
the rest of the world sees two USD cards ($4.99 pack `prod_7GiypMXuirxF4JMrXuXK3L`,
$7.99 7-day pass `prod_1NKQNBkI87DobDXNnKb5PI` — the ₹49 single stays
India-only, below the $4.99 fee floor). A Creem purchase redirects to hosted
checkout and returns to `/pro?creem=success&checkout_id=…`; the claim endpoint
re-verifies the product server-side (never the URL hint) and mints the SAME
`PRO-XXXX-XXXX` entitlement Razorpay would — one entitlement layer, two rails.
Env: `CREEM_PRO_PACK_PRODUCT_ID` + `CREEM_PRO_PASS_PRODUCT_ID` (set in Vercel
prod; create test-mode twins for local Creem E2E).

Razorpay rail (India):

- Plans `pro_single` ₹49 / `pro_pack` ₹149 (5 credits) / `pro_pass` ₹299
  (7 days), amounts env-overridable (`PRO_SINGLE_PAISE`, `PRO_PACK_PAISE`,
  `PRO_PASS_PAISE`, `PRO_PACK_CREDITS`, `PRO_PASS_DAYS`).
- Purchase reuses the roast's checkout (`lib/payments.ts` → order/verify/
  webhook). A verified payment mints a Pro entitlement
  (`lib/pro/entitlements.ts`): a secret `PRO-XXXX-XXXX` code, an atomic credit
  counter or pass expiry in Redis, and an HMAC token the browser holds.
  Idempotent per order; the webhook reconciles if the browser dies mid-verify.
- What's stored is billing state only — code, counter, expiry, paying email.
  Never résumé or report content; the product stays stateless.
- `/api/pro/decompose` consumes one credit per report (pass = unmetered);
  paid chains bypass the free tier's platform budget cap on all four stages.
  Credit refunded if the chain's first stage fails. Free tier unchanged
  (`PRO_FREE_PER_DAY`/IP/day), exhaustion returns `402 payment_required` →
  the UI opens the paywall.
- Restore on a new device with the secret code (`/api/pro/entitlement`),
  rate-limited as an auth surface (strict per-IP + per-code + backoff).
  Email-only restore deliberately not offered — same posture as the roast Pass.
- Security note: wiring this surfaced that `/api/payment/verify` trusted the
  client-sent `plan` when minting — a valid ₹7 payment could claim a ₹199
  Pass. Fixed for all entitlement plans: the plan is now read from the ORDER's
  server-set `notes` via a Razorpay server-to-server lookup; a mismatch
  acknowledges the payment but refuses the mint.

The monthly-subscription business in this suite is **Hire**, not Pro:
recruiters screen continuously, month after month — seats + screening volume
is textbook SaaS (see [docs/hire.md](./hire.md)). That's the other half of the
wedge/expansion sequencing: Pro earns fast, per-use, on the owned audience;
Hire becomes the recurring-revenue product once the engine is battle-tested
and revenue proves the concept. You get monthly subscriptions eventually —
just not on the product that would churn its way to zero.

## Files

`app/pro/page.tsx` · `components/pro/ProMatch.tsx` (intake, progress, report)
· `app/api/pro/{decompose,extract,rate,coach}/route.ts` ·
`lib/pro/{prompts,validate,limits}.ts`. Everything else is `lib/hire/*`,
shared.
