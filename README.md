# 🔥 BurntCV

> Upload your résumé. Get roasted. Get the brutal truth your recruiter is too polite to say.

A consumer AI micro-product that roasts résumés (and LinkedIn profiles) — satirically,
sarcastically, and a little too accurately — then hands back a real career trajectory,
one dark-mode insight, and a screenshot-perfect share card. Built from the
[product doc](./PRD.md) and the approved Claude design.

## The engine (the whole product)

The non-obvious architectural decision (PRD §7): the model **silently diagnoses the
real flaws first, then jokes about them.** Diagnose-then-roast is what makes every
line funny-*because*-true instead of generic insult-comic filler. The prompt lives in
[`lib/roast.ts`](./lib/roast.ts) — `buildRoastPrompt()`.

**Intensity and safety are orthogonal.** `Mild → Medium → Unhinged 💀` controls how
hard the punches land on the *writing* — never whether the safety rails apply. The
hard rules (never mock protected characteristics, never attack the person's worth) are
constant across all intensities. That single rule is the line between a movement people
share and a screenshot that gets you cancelled.

## Stack

| Layer | Pick |
|---|---|
| Framework | Next.js (App Router) + React 19, TypeScript |
| AI | Claude API (`claude-sonnet-4-6` by default) via server routes |
| Styling | Design's inline styles ported verbatim via a `css()` helper (pixel fidelity) |
| PDF parsing | `unpdf`, server-side (`/api/extract`) |
| Card export | `html2canvas` → PNG, client-side |
| Persistence | `localStorage` only — roast text + usage, **never the résumé** |

## How AI calls are routed

- **Free / Pro** → `/api/roast` & `/api/glowup` use the platform `ANTHROPIC_API_KEY`
  and are IP-rate-limited (5/day free).
- **Bring your own key (BYOK)** → the browser calls Anthropic **directly** with the
  user's own key (`anthropic-dangerous-direct-browser-access`), so the key never
  touches our server — honoring the "we never see it" promise (PRD §10).

## Run locally

```bash
cp .env.example .env.local   # add your ANTHROPIC_API_KEY (optional — BYOK works without it)
npm install
npm run dev                  # http://localhost:3000
```

Without a server key, the free path returns a graceful fallback roast and nudges users
to add their own key in Settings. Add `ANTHROPIC_API_KEY` for live roasts.

## Privacy (PRD §10)

Résumés are processed **in memory and never persisted**. PDF text extraction happens
server-side and is discarded after the roast. History stores the roast output only —
never the raw document.

## Production hardening (shipped)

- **Durable rate limiting** — per-IP daily limits via **Upstash Redis** when
  `UPSTASH_REDIS_REST_URL` / `_TOKEN` are set, with graceful in-memory fallback
  ([`lib/ratelimit.ts`](./lib/ratelimit.ts)). Protects API spend across serverless instances.
- **Security headers** — CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`,
  Referrer-Policy, Permissions-Policy ([`next.config.mjs`](./next.config.mjs)). CSP allows
  only self + Anthropic (BYOK) + Fontshare + Vercel Analytics.
- **Upstream resilience** — 45s timeout (AbortController) on every Claude call;
  overloaded/timeout → retryable "overloaded" state instead of a mismatched fallback.
- **Analytics** — Vercel Analytics with custom events for the North Star (share rate):
  `roast_completed`, `card_share`, `card_download`, `caption_copy`, `glowup_run`,
  `pro_unlock`, `byok_added` ([`lib/analytics.ts`](./lib/analytics.ts)).
- **Share loop** — dynamic branded OG + Twitter images ([`app/opengraph-image.tsx`](./app/opengraph-image.tsx)),
  favicon, `robots.txt`, `sitemap.xml`, full SEO metadata.
- **PDF extraction** — migrated to `unpdf` (maintained, serverless-safe) with 10MB +
  MIME guards. Removed the vulnerable `pdf-parse`.
- **Graceful failure** — themed `error.tsx` / `not-found.tsx`, `/api/health` probe.

## Deploy (Vercel)

1. Push to a Git repo and import into Vercel (framework auto-detected).
2. Set env vars in the Vercel dashboard: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`,
   and (recommended) `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
3. Deploy. API routes run on the Node.js runtime. Verify with `GET /api/health`.

## Monetization

The unit of payment is a **roast**, not a feature (all personas, Unhinged, and the
Glow-Up are always available):

- **First roast: free**, everything unlocked.
- **After that: ₹7 per roast** (pay-then-roast-now, no stored balance), or
- **₹199 for a 6-Month Pass** — 5 roasts/day for 6 months, then renew (watermark-free
  cards too). Past the daily 5, Pass holders can top up at **₹5/roast**.
- **BYOK** — bring your own Anthropic key and roast unlimited, free.

Measured cost is **~₹1.3 per roast** (Sonnet 4.6, 6k-char cap), so ₹7 ≈ 81% margin. The
Pass stores an expiry timestamp (`passUntil`, +182 days) and reverts to pay-per-roast
when it lapses; the 5/day cap bounds worst-case exposure to ~₹6.30/day.

> **Naming note:** the plan expires at 6 months, so it is called a "6-Month Pass" — not
> "Lifetime". Calling a time-limited plan "lifetime" is a dark pattern and a trust risk.

Payments run through a **Razorpay Standard Checkout** layer ([`lib/payments.ts`](./lib/payments.ts) +
[`/api/payment/*`](./app/api/payment)) with server-side HMAC signature verification
(constant-time). With no keys set it runs in **simulated mode** (instant unlock, no charge).

## Entitlements & reliability

The **6-Month Pass** is a real server-side entitlement, so it survives browser-clear and
device-switch — without forcing a signup wall on the (viral, anonymous) free roast:

- On a verified ₹199 payment, the server mints a durable entitlement in **Upstash**
  ([`lib/entitlements.ts`](./lib/entitlements.ts)), keyed by a secret **restore code**
  (`BURNT-XXXX-XXXX`) + the paying email, and returns an **HMAC-signed Pass token**.
- Paid roasts carry that token; the roast route bypasses the rate limit **only** after
  verifying it server-side — the client can no longer just claim `unlimited`.
- **Restore** on a new device: paste the code (or paid email) in Settings →
  [`/api/entitlement/restore`](./app/api/entitlement/restore) issues a fresh token.
- **Webhook** ([`/api/payment/webhook`](./app/api/payment/webhook)) handles `payment.captured`
  (raw-body signature-verified, idempotent per order) so the Pass is granted even if the
  browser closes before the client verify call returns.

> Free / single / top-up roasts stay anonymous and device-local (`localStorage`) — clearing
> storage grants another free roast, bounded by the per-IP rate limit. Durable entitlements
> require Upstash; without it the store falls back to in-process (single instance only).

## Deliberately v2 (not blocking launch)

- **Cross-device history** — roast history is still device-local; a full account layer
  (Clerk/Supabase) would sync it. Not needed to charge for the Pass.
- One residual `npm audit` moderate advisory (`postcss`) is transitively pinned **inside
  Next.js itself** and isn't reachable in our usage; it clears on the next Next release.
