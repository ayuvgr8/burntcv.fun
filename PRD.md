# Resume Roaster — Product Document

| | |
|---|---|
| **Working title** | Resume Roaster (naming options in §16) |
| **Type** | Consumer AI micro-product, virality-led |
| **Owner** | Ayush Verma |
| **Status** | Draft v0.1 — for build |
| **One-liner** | *Upload your résumé. Get roasted. Get the brutal truth your recruiter is too polite to say.* |

---

## 1. TL;DR

A web app where you drop in a résumé (or a LinkedIn profile) and an AI roasts it — satirically, sarcastically, and a little too accurately. Every roast ends with two things people don't expect from a joke generator:

1. **A career trajectory** — where you're actually headed vs. where you *think* you're headed, delivered with a straight face and a knife.
2. **One "dark mode" insight** — the existential, uncomfortably-honest observation that makes people screenshot it and send it to a group chat at 1am.

The roast is the hook. The **insight is the retention**. The **shareable roast card is the growth loop**. That's the whole machine.

This is a weekend-to-two-week build on your usual stack, with a free→paid wedge and a built-in viral surface. It's a perfect IndMRR "build in public" product.

---

## 2. Why this actually works (and isn't just a gimmick)

Most "AI résumé" tools are boring because they're *helpful in the way a dentist is helpful*. People don't share dentists. The market is saturated with earnest "ATS optimizers" that nobody talks about.

Three forces make a roaster work where an optimizer doesn't:

- **Pain is the distribution channel.** Job hunting is demoralizing, repetitive, and lonely. Humor is how people cope with things they can't control. A funny, *true* roast gives them catharsis — and catharsis gets shared.
- **"Funny because true" beats "useful but dull."** The roast isn't insults — it's *insight wearing a clown nose*. Every good line is a real critique the user already half-knew, said in a way that makes them laugh instead of cry. That's the entire craft (see §7).
- **The output is a flex, not a confession.** Sharing "here's my optimized résumé" is bragging and nobody does it. Sharing "an AI absolutely destroyed my résumé and I'm crying laughing" is *relatable and self-deprecating* — the single most shareable tone on the internet.

**The wedge:** the roast gets them in the door and gets them to share. The *real* career insight is what they quietly come back for — and what they pay for.

---

## 3. Vision & positioning

> **The Roast Office** isn't a résumé tool. It's a mirror that talks back.

Positioning statement: *For job-seekers drowning in generic "tailor your résumé!" advice, Resume Roaster is the brutally honest, very funny second opinion — the friend who tells you your résumé says nothing, then tells you exactly what to do about it.*

| | We are | We are NOT |
|---|---|---|
| Tone | Satirical, sarcastic, sharp, secretly kind | Cruel, bullying, demoralizing |
| Output | A laugh + a real insight | A 12-point "ATS compatibility score" |
| Target of the joke | Your *choices, clichés, and the document* | You, your worth, or who you are |
| Feeling on exit | "That hurt and I'm screenshotting it" | "I feel worse about my life" |

The line between *roast* and *bully* is the entire product (§11). Get it right and it's a movement; get it wrong and it's a cancellation.

---

## 4. Target users

| Persona | Who | Why they roast | What they pay for |
|---|---|---|---|
| **The Doomscrolling Job-Seeker** | 22–32, mid-search, slightly burnt out | Catharsis + a laugh + secretly wants real feedback | Unlimited roasts, the "glow-up" advice |
| **The Career-Curious Employed** | Has a job, "just looking," ego intact | Vanity check — "how does my résumé read?" | Personas, LinkedIn roast |
| **The Chronically Online Sharer** | Twitter/X, LinkedIn, Reddit native | The roast card *is* content for their feed | Probably won't pay, but is the **growth engine** |
| **The LinkedIn Lurker** | Watches the cringe daily | Wants to roast LinkedIn specifically | LinkedIn roast module |
| **The Gifter** | Wants to roast a friend / colleague | "You NEED to see what it said about your résumé" | Gift roasts / shareable links |

Primary acquisition persona = **the Sharer**. Primary revenue persona = **the Job-Seeker**. Design for both.

---

## 5. The core experience

```
   Drop résumé / paste text / connect LinkedIn
                 │
                 ▼
        Pick your pain tolerance  ──►  [ Mild · Medium · Unhinged ]
                 │
                 ▼
        Pick a roaster persona     ──►  [ Recruiter · Chef · VC · Disappointed Parent · ... ]
                 │
                 ▼
   ┌─────────────────────────────────────────────┐
   │  THE ROAST                                  │
   │  • The opening burn                          │
   │  • 4–6 line-by-line roasts                   │
   │  • Career Trajectory (real vs. satirical)    │
   │  • 🌑 One dark-mode insight                  │
   │  • The "actually, here's the fix" (paid)     │
   └─────────────────────────────────────────────┘
                 │
                 ▼
        Generate Roast Card  ──►  Share to X / LinkedIn / download
```

Time to first laugh should be **under 30 seconds** from landing. No signup wall before the first roast — the roast *is* the demo.

---

## 6. Feature specification

### F1 — Resume Roast `P0`

The core. Parse the résumé, return a structured roast.

**Intensity tiers** (user-selectable; this is also a paywall lever):

- **Mild** 🌤 — "HR-safe." Gently sarcastic, the kind of feedback your nicest mentor would give after two beers. Free.
- **Medium** 🔥 — The default. Properly sarcastic, lands real punches, still affectionate.
- **Unhinged** 💀 — No mercy, maximum satire, *this is where the dark humour lives*. Gated behind sign-in or paid (also a natural rate-limit point).

**Roast structure (every roast returns):**
1. **The cold open** — one devastating opening line that sets the tone. ("Let's see what we're working with… oh.")
2. **Line items** — 4–6 specific roasts tied to *actual content* in the résumé (a buzzword, a typo, a vague bullet, a suspicious gap, an over-claimed skill). Specificity is everything — generic roasts feel like horoscopes.
3. **The verdict** — one-sentence summary judgment.

> **Sample (Medium):**
> *"'Results-driven professional with a passion for synergy.' We're three words in and you've already described every human who has ever held a job. Bold."*
> *"You listed 'Microsoft Office' as a skill. We were genuinely worried a grown adult might not be able to open a Word doc. Crisis averted."*
> *"'Familiar with Python.' That word 'familiar' is doing the work of an entire engineering degree. Respect to it."*

### F2 — The Career Trajectory `P0`

The "insightful" differentiator. Two readings, side by side:

- **The satirical projection** — where this résumé is *headed* if nothing changes. Played completely straight, which is what makes it funny.
  > *"Trajectory analysis: at your current rate of 'spearheading cross-functional initiatives,' you are 4 years from becoming a LinkedIn thought leader and exactly 0 years from anyone reading your posts."*
- **The real read** — the genuine insight underneath. This is the part that earns trust and conversions.
  > *"Real talk: you have strong execution but no narrative. Every bullet describes a task; none describes a *transformation you caused*. Pick one storyline — 'I turn messy ops into systems' — and make every line serve it."*

The trick: the satire and the truth point at the **same flaw**. The joke is the spoonful of sugar; the insight is the medicine.

### F3 — The 🌑 Dark-Mode Insight `P0`

Exactly **one** per roast. Set apart visually (dark card, the one you screenshot). This is the existential, uncomfortably-honest line — black humour, not cruelty. It targets *the human condition / the absurdity of work*, never the person's value.

> *"Dark-mode insight: the two-year gap on this résumé is the single most honest thing on the page. We respect it deeply. The ATS bot will not."*

> *"You will spend roughly 80,000 hours of your one wild and precious life at work. This résumé suggests 79,000 of them will be in meetings that could have been emails. Choose differently."*

**Why one and only one:** scarcity makes it the hero line. Five dark jokes is edgelord noise; one is a gut-punch people remember.

### F4 — Roast Personas `P1` (free sampler, rest paid)

The same résumé, roasted in different voices. This is the **replay value** — users re-run to collect roasts, and it's a clean upsell.

| Persona | Voice | Best for |
|---|---|---|
| **The Disappointed Recruiter** | Dead-eyed, has seen 10,000 of these | Default |
| **Gordon (Careers Edition)** | Kitchen-nightmare energy, ALL CAPS verbs | Maximum chaos |
| **The Brutally Honest VC** | "What's your moat? You don't have one." | Founders / PMs |
| **Your Disappointed Parent** | "Beta, the neighbour's son is a manager now" | *Devastatingly* relatable (India-first gold) |
| **The LinkedIn Influencer** | Roasts you in cringe-thread voice — meta and perfect | Sharers |
| **The Existential Philosopher** | Camus reads your résumé | Dark-humour fans |

> Keep personas as **swappable prompt modules** (a system-prompt fragment + a few style exemplars each), so adding a persona is a config change, not a deploy. New personas = cheap, recurring "what's new" content for IndMRR.

### F5 — The Glow-Up `P1` (paid)

After the laughs, the *actually useful* part — and the clearest reason to pay. Same flaws the roast found, now as a fix-list:

- 3–5 specific rewrites ("here's that vague bullet, rewritten to show impact")
- The one narrative thread the résumé is missing
- A "what to cut" list (the filler that's actively hurting them)
- Optional: a rewritten summary paragraph

This converts the dopamine of the roast into a "okay, take my money, fix it" moment while intent is hot.

### F6 — Shareable Roast Card `P0` (this is the growth loop, not a nice-to-have)

The single most important *growth* feature. Auto-generate a clean, screenshot-perfect card:

- The cold-open line + the dark-mode insight (the two most shareable bits)
- Branded but tasteful watermark + URL (free tier keeps the watermark; removing it is a paid perk)
- One-tap share to X / LinkedIn / WhatsApp / download PNG
- Pre-filled share copy: *"I let an AI roast my résumé and I have never felt so seen 💀 [link]"*

Card design *is* marketing. Spend real effort here — it's the billboard that shows up in feeds.

### F7 — LinkedIn Roast `P1` (high virality, treat as its own module)

LinkedIn is **self-parody as a platform**, which makes it the easiest, most shareable surface to roast. See §10 for the input-method reality check (scraping is a no — use paste/PDF export).

Targets unique to LinkedIn:
- **The headline** — "Visionary | Disruptor | Coffee Lover ☕ | Girl Dad 👶" → *"Four identities, none of them a job title."*
- **The "About" section in third person** → *"Nothing says 'down to earth' like narrating your own life like a wildlife documentary."*
- **Engagement bait** — "Agree? 👇", "Sad to announce…", "I'm humbled and honored" → *"You were humbled and honored to receive an award you nominated yourself for. The humility is genuinely staggering."*
- **The connection flex** — "500+ connections, 2% engagement" → *"You've built a network the size of a small town that collectively ignores you."*
- **Buzzword density** — synergy / leverage / disrupt / thought leader / ninja / rockstar / guru.
- **The 'Open to Work' green ring** vs. the "we're hiring rockstars!!" post they made last year.

LinkedIn roasts should ship as their own shareable card format and their own landing page — it's a distinct viral entry point that can rank for "linkedin roast generator."

---

## 7. The Roast Engine — AI architecture & prompt design (the soul)

Everything above is UI. **This section is the product.** A roaster lives or dies on whether the AI is actually funny *and* actually right. That's a craft problem, solved in the prompt layer.

### 7.1 Pipeline

```
Input (PDF/text/LinkedIn export)
   │
   ▼
[1] Extract & structure ── pull text; identify sections, bullets, skills, dates, gaps, buzzwords
   │
   ▼
[2] Diagnose (silent) ──── model first identifies REAL weaknesses (no jokes yet):
   │                        vague bullets, no metrics, cliché density, skill over-claims,
   │                        missing narrative, gaps, formatting tells
   ▼
[3] Roast ──────────────── turn each real weakness into a joke (intensity + persona applied)
   │
   ▼
[4] Trajectory ─────────── satirical projection + the genuine read (same flaw, two lenses)
   │
   ▼
[5] Dark insight ───────── exactly one; existential, not cruel
   │
   ▼
[6] Format ─────────────── JSON → UI + roast card
```

The key architectural decision is **[2] before [3]**: make the model *find the real flaw first*, then joke about it. If you ask it to "be funny" directly, you get generic insult-comic filler that could apply to any résumé. If you make it diagnose first, every joke is anchored to something real on *their* page. **Funny-because-true is an architecture, not a vibe.**

### 7.2 The roast recipe (encode this in the system prompt)

Every good roast line = **Specific detail + Real critique + Unexpected framing.**

- **Specific** — quote or reference something actually on their résumé. No horoscopes.
- **True** — there must be a real, defensible critique underneath. If you removed the joke, an honest mentor would still nod.
- **Unexpected** — the framing/comparison is what makes it land. ("'Familiar with Python' is carrying a career on the back of one adverb.")

And the hard rule that makes it *shareable instead of cancellable*: **the joke targets the writing, the clichés, and the choices — never the person's intelligence, identity, background, or worth.** "This bullet says nothing" is a roast. "You are a failure" is just abuse, and abuse doesn't get shared, it gets reported.

### 7.3 Prompt scaffolding (illustrative)

```
SYSTEM (base):
You are a sharp, very funny résumé critic. Your humor is satirical and
sarcastic, but it is grounded in real, useful critique — funny BECAUSE
it's true. You roast the WRITING and the CHOICES, never the person.
Never reference or mock protected characteristics (gender, race, age,
religion, disability, nationality, appearance, health). Never tell anyone
they're worthless, hopeless, or should give up.

Before writing any joke, silently identify the 5–6 most real weaknesses
in this résumé: vague/impact-free bullets, missing metrics, cliché and
buzzword density, over-claimed skills, narrative gaps, and formatting
tells. Then roast THOSE specific things.

Every roast line must reference something actually present in the résumé.
No generic lines that could apply to anyone.

PERSONA MODULE (swapped in):
{e.g. "Voice: a world-weary recruiter who has read 10,000 of these and
died a little each time. Dry, deadpan, economical."}

INTENSITY MODULE (swapped in):
{Mild | Medium | Unhinged — controls how hard the punches land, NOT
whether the safety rules apply. Safety rules are constant.}

OUTPUT CONTRACT (strict JSON):
{
  "cold_open": "...",
  "roasts": ["...", "...", ...],        // 4–6, each tied to real content
  "trajectory": { "satirical": "...", "real": "..." },
  "dark_insight": "...",                // exactly one
  "verdict": "...",
  "glow_up": ["...", ...]               // paid; the real fixes
}
```

Enforce JSON (response schema / "respond only in JSON, no preamble") so the UI maps cleanly to cards. Parse defensively and retry on malformed output.

### 7.4 Intensity vs. safety — keep them orthogonal

Intensity changes *how hard it hits*. It must **never** change *the safety rules*. "Unhinged" means more savage about the résumé, not permission to attack the person. This separation is what lets you ship a 💀 mode without it becoming a liability.

### 7.5 Quality guardrails

- **Anti-generic check** — if a roast line doesn't reference real résumé content, regenerate it. Generic = horoscope = dead product.
- **Few-shot calibration** — ship 4–6 gold-standard example roasts in-prompt so the model copies the *register* (clever, specific, kind-underneath) instead of drifting into mean or corny.
- **The "would they screenshot this?" bar** — that's the internal quality target for the cold open and dark insight.
- **Consistency** — same résumé + same settings should feel stable in quality (some variation is fine and good for replay).

---

## 8. User flows

**First-time (no account):**
1. Land → big "Roast my résumé" CTA → drop file / paste.
2. Pick intensity (Mild/Medium default-on) → roast streams in.
3. See trajectory + dark insight → emotional peak.
4. "Generate roast card" → share. *Soft* prompt: "Sign in to unlock 💀 Unhinged mode, all personas, and the fix-list."

**Returning / paid:**
1. New résumé or re-roast existing with a new persona.
2. Unhinged + persona library unlocked.
3. The Glow-Up fix-list available → the "actually improve it" loop.

**LinkedIn flow:**
1. Paste profile text / upload "Save to PDF" export (no scraping — §10).
2. LinkedIn-specific roast + its own card format.

---

## 9. Tech stack (your usual, nothing exotic)

| Layer | Pick | Notes |
|---|---|---|
| Frontend | **Next.js** (App Router) | Single app, route handlers for the API — no Vite split |
| Styling | Tailwind + a tiny bit of motion | Card design deserves real polish |
| AI | **Claude API** (via server route) | Diagnose→roast in one structured call; never expose keys client-side |
| Parsing | PDF → text server-side (e.g. `pdf-parse`/equivalent) | Keep extraction on the server |
| Card gen | Server-rendered OG image / `satori`-style PNG | Screenshot-perfect, consistent |
| Auth | **Clerk** or Supabase Auth | Single domain → avoids the satellite-domain headache you hit before |
| DB | **Supabase** (Postgres) | Store roasts (if consented), usage counts, payments |
| Payments | **Razorpay** (India) + Stripe (intl) | India-first, your standard |
| Rate-limit | Per-IP/user (Upstash or DB counter) | Protects API spend; doubles as the free→paid wall |
| Hosting | **Vercel** | You have it connected |

**Cost control matters** since the value unit is an LLM call. Rate-limit free roasts (e.g. 1–2/day per IP), cache nothing user-identifying, and make "more roasts" a natural reason to sign in / pay.

---

## 10. Data & privacy (don't skip — résumés are PII)

Résumés contain names, emails, phone numbers, employers. Treat this seriously; it's also a trust signal you can market ("we don't keep your résumé").

- **Default to ephemeral.** Process in memory, return the roast, *don't persist the résumé* unless the user opts in to save it.
- **PII-light storage.** If you store roasts for history, consider storing the *roast output*, not the raw résumé. Strip/avoid storing contact details.
- **LinkedIn = no scraping.** Automated scraping of LinkedIn violates their ToS and breaks constantly. **Input method: user pastes their profile text or uploads their own "Save to PDF" export.** This is compliant, reliable, and zero-infrastructure. Market it as "paste your profile" — friction is low and it sidesteps a legal/operational mess.
- **Clear consent + a plain-English privacy line.** "Your résumé is roasted and forgotten. We don't store it unless you ask us to."
- If India is the primary market, keep DPDP in mind (purpose limitation, consent, deletion on request) — you've already done this thinking for the CDP work; same principles, lighter footprint.

---

## 11. Guardrails & brand safety (this is the line between movement and cancellation)

The product is *one bad output away* from a screenshot that reads "this app told someone their life is worthless." That kills it. Engineer against it:

**Hard rules (constant across all intensities):**
- **Never** mock protected characteristics: gender, race, age, religion, disability, nationality, appearance, health, sexual orientation.
- **Never** tell a user they're worthless, hopeless, stupid, or should give up.
- The target is always **the résumé, the clichés, the choices** — never the human's inherent value.
- The dark insight is **existential / absurdist**, about work and the human condition — not a personal attack.

**Distress awareness:** some users are job-hunting from a genuinely low place. The product should be able to land a soft tonal off-ramp — e.g., if input signals real distress, the roast stays affectionate and the *real* read leans encouraging. A roaster that reads the room is a roaster people trust.

**Why this is also good business:** mean-spirited content gets reported and deplatformed; *clever, kind-underneath* content gets shared. The safety rails aren't a tax on the fun — they're what makes the fun durable and viral. The best roasts in comedy punch *up* or punch *at the work*, never *down* at the person.

---

## 12. Monetization

Classic free→paid wedge with your India-first instincts.

| Tier | Price | Gets |
|---|---|---|
| **Free** | ₹0 | 1–2 roasts/day, Mild + Medium, default persona, watermarked card |
| **Roasted Pro** (one-time) | **₹99–₹199** | Unlimited roasts, 💀 Unhinged, all personas, no watermark, the Glow-Up fix-list |
| **Gift a Roast** | ₹49 | Send a roast link to a friend/colleague (built-in K-factor) |

Why one-time, low-ticket: matches the impulse-buy, low-stakes nature of the product (people won't subscribe to a joke generator, but they'll drop ₹99 mid-laugh). Mirrors your OpenSlot "₹999 lifetime" instinct, scaled to a smaller product.

**Upsell moments (where intent is hottest):**
- Right after the roast → "Want the fix-list? 👀" (Glow-Up)
- On hitting the free rate limit → "Roast again as Gordon Ramsay 🔥"
- On the share screen → "Remove the watermark"

Optional later: a B2B-ish angle (universities/bootcamps "roast your students' résumés as a workshop") — *parking lot, not v1.*

---

## 13. Growth & go-to-market

This product is built to spread; lean into it.

**The viral loop (design it explicitly):**
```
User gets roasted → laughs → shares card (watermarked, w/ URL)
        → friend sees it in feed → "lol I need to do this" → gets roasted → shares
```
The roast card with watermark is the engine. Every free user is a billboard. Make the card *too good not to post*.

**Launch plan (IndMRR-native):**
- **Build in public** on IndMRR / X — "building a résumé roaster, here's the first roast it wrote 💀" The dev journey is itself shareable.
- **Seed with spicy examples** — roast a few (anonymized / fictional) over-the-top résumés and LinkedIn headlines; those screenshots *are* the ads.
- **Launch surfaces:** Product Hunt, r/recruitinghell, r/jobs, r/india startup communities, LinkedIn (ironically — roasting LinkedIn *on* LinkedIn is catnip), X.
- **SEO long tail:** "résumé roast generator," "linkedin roast," "roast my cv" — cheap, intent-rich, and the LinkedIn module gets its own ranking page.
- **The gift mechanic** turns every user into a sender.

**Timing hooks:** grad season, layoff waves (handle with taste), New Year "new job" energy.

---

## 14. MVP scope & roadmap

Be ruthless. Ship the loop, not the wishlist.

### v1 — "Can it roast and can it spread?" (the only question that matters)
`P0`
- Résumé upload (PDF) + paste
- Diagnose→roast engine (Medium + Mild)
- Career Trajectory (satirical + real)
- One dark-mode insight
- Shareable roast card with watermark + share copy
- Basic rate-limit
- Ephemeral processing (no résumé storage)

**If v1 doesn't make people share, no amount of v2 features will save it. Validate the loop first.**

### v2 — "Make them come back and pay"
`P1`
- Sign-in + Unhinged 💀 tier
- Persona library (start with 3–4)
- The Glow-Up paid fix-list
- Payments (Razorpay/Stripe)
- LinkedIn roast module + its own card/landing page

### v3 — "Compound it"
`P2`
- Re-roast / roast history (with consent)
- Gift-a-roast flow
- More personas as recurring content
- Maybe: "roast my startup pitch / portfolio / Twitter bio" as adjacent micro-products on the same engine

---

## 15. Success metrics

**Leading (watch daily):**
- **Roast completion rate** — % who finish a roast after landing (target: >80%)
- **Share rate** — % of roasts that generate/share a card (this *is* the growth metric; target: >25%)
- **K-factor** — new users per sharing user (>1.0 = it grows itself)
- **Time to first laugh** — landing → roast shown (<30s)

**Lagging (watch weekly/monthly):**
- **Repeat roast rate** — do people come back / re-roast?
- **Free→paid conversion** — % unlocking Pro (impulse-priced, so volume matters more than rate)
- **Glow-Up attach rate** — % buying the fix-list after a roast

The North Star is **share rate** — a roaster that doesn't get shared is just an expensive way to make one person laugh once.

---

## 16. Naming & taglines (bonus — pick one)

| Name | Vibe |
|---|---|
| **The Roast Office** | Pun-forward, friendly, very brandable ⭐ |
| **Roasted.cv** | Clean, modern, .cv domain is *chef's kiss* |
| **Burnt CV** | Short, punchy, a little edgy |
| **Résumé Roaster** | Does what it says (working title) |
| **CVbecue / Roast My CV** | Maximum dad-joke energy |

Tagline options:
- *"The brutal truth your recruiter is too polite to tell you."*
- *"Upload your résumé. Lose your ego. Find your fix."*
- *"We read it so a recruiter doesn't have to suffer."*
- *"Honest feedback, dishonest amounts of sarcasm."*

---

## 17. Open questions

- **`[product]`** First-load: no-signup roast, or email-gate after the first? (Recommend: no gate — the roast is the demo. Validate.)
- **`[legal]`** LinkedIn input — confirm paste/PDF-export only; no automated scraping. (Strongly recommend yes.)
- **`[product]`** Do we persist roasts at all in v1, or fully ephemeral? (Recommend: fully ephemeral v1; add opt-in history in v2.)
- **`[brand]`** How dark is "too dark" for the default tier? Where exactly does Unhinged sit? (Needs a written tone bible + a banned-topics list before launch.)
- **`[cost]`** Free-tier rate limit number — tune against actual per-roast API cost once measured.
- **`[growth]`** Watermark aggressiveness — visible enough to drive traffic, tasteful enough that people still post it.

---

## 18. Appendix — example outputs (the bar to hit)

These set the quality target. Note the pattern: **specific detail + real critique + unexpected framing**, and the joke always lands on the *writing*, never the *person*.

**Résumé — cold opens**
- *"Let's see what we're working with… ah. A document that confidently says nothing, in Calibri."*
- *"Two pages. For a career that, based on these bullets, could fit on a Post-it. Ambitious use of whitespace."*

**Résumé — line items**
- *"'Detail-oriented professional' — and yet 'recieved' is misspelled in the very next line. There's a poem in there somewhere."*
- *"Every bullet starts with 'Responsible for…'. You've written a list of things that were *near* you, not things you *did*."*
- *"You put 'Team Player' and 'Works well independently' two lines apart. We admire a résumé that contradicts itself before the recruiter gets the chance."*

**Trajectory**
- *Satirical:* *"At this rate you'll make Senior Manager of Synergy by 2031, a role with no responsibilities and a beautiful title."*
- *Real:* *"You've clearly delivered things — but the résumé hides it behind task-language. Convert three bullets from 'what I was responsible for' to 'what changed because of me, with a number.' That alone moves you up a tier of callbacks."*

**Dark-mode insight 🌑**
- *"The gap between 2021 and 2023 is the most honest line on this page. We respect it. The ATS bot, tragically, has no soul."*
- *"You will trade roughly a third of your waking life for money. This résumé is the 90-second pitch for how you spend it. Make it say something true."*

**LinkedIn**
- *"Headline: 'Visionary | Disruptor | Lifelong Learner | Dog Dad 🐶'. That's a personality, not a job. Recruiters are searching for the job."*
- *"You announced you were 'humbled and honored' in 14-point bold. The font size and the humility are in direct conflict."*
- *"Your 'About' is in the third person. Either you have a ghostwriter or you've started referring to yourself like a museum exhibit."*

---

*Tone of the product, in one line: it should hurt the way a good friend's honesty hurts — because it's right, and because they clearly want you to win.*
