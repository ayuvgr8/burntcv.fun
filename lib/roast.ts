// The soul of BurntCV — the roast engine's data, prompts, and safety rails.
// Ported from the approved design prototype. The key architectural decision
// (PRD §7): the model silently diagnoses REAL weaknesses first, then jokes
// about them. Diagnose-then-roast is what makes every line funny-because-true.

export type IntensityId = "mild" | "medium" | "unhinged";
export type PersonaId =
  | "recruiter"
  | "gordon"
  | "vc"
  | "parent"
  | "influencer"
  | "philosopher";

export interface Persona {
  id: PersonaId;
  emoji: string;
  label: string;
  desc: string;
  free: boolean;
  voice: string;
}

export interface Intensity {
  id: IntensityId;
  emoji: string;
  label: string;
  desc: string;
  free: boolean;
  note: string;
}

export interface BentoItem {
  term: string; // an exact word/phrase pulled from the résumé
  tag: string; // a one-word verdict
  emoji: string;
}

export interface BuzzScore {
  value: number; // 0–100 buzzword-density (higher = more roastable)
  grade: string; // single letter A–F
  label: string; // punchy 2–4 word verdict
}

// One roast beat. The joke is the hook; `quote` is the receipt that proves it's
// about THEIR résumé, and `fix` is the reason the free tier is worth returning
// to — every burn now hands back a concrete thing to go change.
export interface RoastLine {
  quote: string; // exact phrase copied from the résumé, so the burn has a receipt
  burn: string; // the joke
  fix: string; // plain-English, do-this-now repair
}

export interface Roast {
  cold_open: string;
  roasts: RoastLine[];
  strengths?: string[]; // what genuinely works — keeps the roast credible, not cruel
  trajectory: { satirical: string; real: string };
  dark_insight: string;
  verdict: string;
  bento?: BentoItem[];
  score?: BuzzScore;
}

// Max characters of résumé text sent to the model. Covers a full 1–2 page CV.
// Measured cost at this cap ≈ ₹1–1.3 per roast on Sonnet 4.6.
export const INPUT_CHAR_CAP = 6000;

// A concrete project the user should go build (or volunteer for at work) —
// each one exists to EARN a résumé bullet they currently can't write.
export interface GlowupProject {
  title: string;
  kind: "personal" | "at-work";
  what: string; // what to build / do, concrete enough to start this week
  bullet: string; // the résumé bullet it earns once done ([placeholders] ok)
}

// A category of company worth applying to, with real example names.
export interface GlowupCompany {
  type: string; // e.g. "Series B fintech scale-ups"
  why: string; // why THIS résumé lands there
  examples: string[]; // 2-3 recognizable names in that bucket
}

// Skills / tech to master, staged so it reads as a path, not a pile.
export interface GlowupRoadmap {
  now: string[]; // close these gaps before applying
  next: string[]; // the 3-6 month edge
  later: string[]; // the long-game differentiators
}

export interface Glowup {
  one_thing: string;
  score_before: number;
  score_after: number;
  summary: string;
  narrative: string;
  strengths: string[]; // real assets to lead with — what NOT to edit away
  rewrites: { before: string; after: string; why: string }[];
  // Ordered, timed, do-it-tonight. `step` is the scannable checklist line;
  // `detail` carries the specifics so depth doesn't cost readability.
  action_plan: { step: string; detail: string; minutes: number }[];
  cut: { text: string; why: string }[];
  next_moves: { roles: string[]; gaps: string[] };
  recruiter_read: string[];
  ats_gaps: string[];
  interview_landmines: string[];
  projects: GlowupProject[];
  companies: GlowupCompany[];
  roadmap: GlowupRoadmap;
}

export const PERSONAS: Persona[] = [
  {
    id: "recruiter",
    emoji: "🧐",
    label: "Disappointed Recruiter",
    desc: "Dead-eyed, has seen 10,000 of these",
    free: true,
    voice:
      "a world-weary recruiter who has read 10,000 résumés and died a little each time — dry, deadpan, economical",
  },
  {
    id: "gordon",
    emoji: "🔥",
    label: "Chef On The Line",
    desc: "Kitchen-nightmare energy, ALL-CAPS verbs",
    free: false,
    voice:
      "a furious celebrity chef mid kitchen-nightmare intervention — theatrical disgust, ALL-CAPS verbs, secretly desperate for you to win",
  },
  {
    id: "vc",
    emoji: "📈",
    label: "Brutally Honest VC",
    desc: "“What’s your moat? You don’t have one.”",
    free: false,
    voice:
      "a brutally honest venture capitalist — everything is a market, a moat, a metric; clipped and merciless",
  },
  {
    id: "parent",
    emoji: "🫠",
    label: "Disappointed Parent",
    desc: "“The neighbour’s son is a manager now”",
    free: false,
    voice:
      "a disappointed parent comparing you to the neighbour’s more successful child — loving, guilt-trippy, devastating",
  },
  {
    id: "influencer",
    emoji: "💼",
    label: "LinkedIn Influencer",
    desc: "Roasts you in cringe-thread voice",
    free: false,
    voice:
      "a cringe LinkedIn influencer roasting you in broetry-thread voice — one line per sentence, painfully self-aware",
  },
  {
    id: "philosopher",
    emoji: "🌑",
    label: "Existential Philosopher",
    desc: "Camus reads your résumé",
    free: false,
    voice:
      "an existential philosopher (Camus energy) reading your résumé as evidence of the absurdity of work",
  },
];

export const INTENSITIES: Intensity[] = [
  {
    id: "mild",
    emoji: "🌤",
    label: "Mild",
    desc: "HR-safe. Gentle.",
    free: true,
    note: "Gentle and affectionate — the feedback a kind mentor gives after two beers. Land soft punches.",
  },
  {
    id: "medium",
    emoji: "🔥",
    label: "Medium Rare",
    desc: "Sarcastic, with bite.",
    free: true,
    note: "Properly sarcastic — land real punches, still affectionate.",
  },
  {
    id: "unhinged",
    emoji: "💀",
    label: "Unhinged",
    desc: "No mercy. Max satire.",
    free: false, // always ₹7 (even the first roast) unless Pass / BYOK
    note: "Maximum savagery aimed at the WRITING — no mercy on the clichés and choices. Never attacks the person.",
  },
];

export function personaById(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

export function intensityById(id: string): Intensity {
  return INTENSITIES.find((t) => t.id === id) ?? INTENSITIES[1];
}

// [2] before [3]: diagnose the real flaw first, THEN joke about it.
export function buildRoastPrompt(
  personaId: string,
  intensityId: string,
  linkedin: boolean,
): string {
  const p = personaById(personaId);
  const it = intensityById(intensityId);
  const target = linkedin
    ? "This is a LinkedIn profile. Target LinkedIn-native crimes: identity-stack headlines ('Visionary | Disruptor | Coffee Lover'), the third-person 'About', engagement bait ('Agree? 👇', 'humbled and honored'), the connection flex, and buzzword density."
    : "This is a résumé / CV.";
  return `You are a sharp, very funny critic for an app called BurntCV. Satirical and sarcastic, but grounded in REAL, useful critique — funny BECAUSE it's true. Roast the WRITING and the CHOICES, never the person.
The user came for the laugh but must leave with a better résumé. Every burn is paired with a fix; the joke is the hook, the fix is the product.
HARD SAFETY (constant, regardless of intensity): never mock protected characteristics (gender, race, age, religion, disability, nationality, appearance, health, orientation); never tell anyone they're worthless, hopeless, stupid, or should give up; the target is the document, the clichés, the choices — never the human's worth; if the text signals genuine distress, stay affectionate and make the 'real' read encouraging.
${target}
METHOD: first silently find the 4 most real weaknesses (vague impact-free bullets, missing metrics, cliché/buzzword density, over-claimed skills, narrative gaps, formatting tells). Then roast THOSE. Every line must quote or reference something ACTUALLY in the text — no generic horoscope lines.
QUOTING: whenever you repeat words from the résumé inside any field, wrap them in double quotes ("like this"). The app renders quoted text in bold, so the reader can see exactly which words are being judged. Never quote something the text doesn't literally contain.
VOICE (applies to cold_open, roasts[].burn, trajectory.satirical, dark_insight, verdict): ${p.voice}.
INTENSITY: ${it.note}
HELPFUL VOICE (applies to roasts[].fix, strengths, trajectory.real — these are NOT jokes): drop the persona and speak like a friend who edits résumés for a living. Warm, plain English, second person ("you"), short sentences. No corporate jargon, no consultant-speak, no scolding. Each fix names the exact change to make and, where a number belongs, tells them to add their own real one — never invent numbers, employers, titles or achievements. Use a square-bracket placeholder like "[add the %]" when a number is needed but absent. Max 30 words per fix.
INTEGRITY: never fabricate facts about this person. Only reference what is actually in the text.
Respond with ONLY minified JSON, no prose, no markdown fences, in exactly this shape:
{"cold_open":"one devastating opening line","roasts":[{"quote":"the exact phrase from the résumé this burn is about, copied verbatim","burn":"the joke, in persona","fix":"the specific change to make, friendly and concrete"}],"strengths":["something in this résumé that genuinely works, quoting it, and why it lands"],"trajectory":{"satirical":"where this is headed if nothing changes, played completely straight","real":"the genuine insight underneath — the same flaw, honest and a little kind"},"dark_insight":"exactly ONE existential or absurdist line about work and the human condition, never a personal attack","verdict":"one-sentence summary judgement","score":{"value":72,"grade":"D","label":"a punchy 2-4 word verdict"},"bento":[{"term":"an exact word or phrase copied from the résumé","tag":"a ONE-word verdict on it","emoji":"one fitting emoji"}]}
COUNTS: roasts exactly 4 — each "quote" copied verbatim from the text (a short fragment, under 15 words), each "burn" a real joke, each "fix" genuinely actionable. strengths exactly 2 — real, specific, quoted; if the résumé is weak, find the two least-weak true things rather than inventing praise. bento exactly 6 — each "term" quoted verbatim from the text (a buzzword, cliché, skill, or bullet fragment), each "tag" a SINGLE word (e.g. Filler, Nope, Cringe, Bless, Vague, Padding), each "emoji" one character. score.value is an integer 0-100 measuring BUZZWORD DENSITY / cliché infestation (higher = more roastable); grade is a single letter A-F (A = clean and specific, F = a buzzword crime scene); label is a witty 2-4 word grade like "Certified Corporate" or "Recovering Synergist". Keep every field punchy.`;
}

// What the user is aiming at. The role is asked for every time (before payment);
// the job description is optional — when present it's the strongest signal we
// have, so the rewrite mirrors its language instead of guessing.
export interface GlowupTarget {
  role?: string;
  jobDescription?: string;
}
export const ROLE_CHAR_CAP = 120;
export const JD_CHAR_CAP = 5_000;

// The Glow-Up is generated in three parts that run in parallel. As one call it
// takes ~50s+ — past the request timeout and uncomfortably close to the
// serverless ceiling. Split three ways it lands in roughly a third of the
// wall-clock, and a failure in one part no longer costs the user the others.
// All three share this preamble so the target role/JD steers them identically.
function glowupPreamble(target: GlowupTarget = {}): string {
  const role = target.role?.trim().slice(0, ROLE_CHAR_CAP) || "";
  const desc = target.jobDescription?.trim().slice(0, 2000) || "";
  const jd = [
    role
      ? `\nTARGET ROLE — this résumé is being sent for: "${role}". Every rewrite, the summary, next_moves, ats_gaps and interview_landmines must be aimed at THIS role, not the person's current one. If the résumé is a stretch for it, say so in recruiter_read and bridge the gap honestly — never invent the missing experience.\n`
      : "",
    desc
      ? `\nTARGET JOB DESCRIPTION — the actual posting. Mirror its vocabulary and priorities; ats_gaps must be keywords THIS posting uses that the résumé is missing:\n${desc}\n`
      : "",
  ].join("");
  return `You are the BurntCV critic in HELPFUL mode. The roast is over — this is rehabilitation, and the user PAID for it, so it must feel like a genuine upgrade, not three tips. Keep a trace of the app's dry wit, but the substance has to be real: this is the part they paid for.
Work only from the résumé text provided. Every line must reference something ACTUALLY in it — a real bullet, a real gap, a real title. No generic career advice that could apply to anyone; that's the fastest way to feel like a refund.
INTEGRITY — non-negotiable: NEVER invent numbers, employers, job titles, tools, or achievements. Use only facts present in the input. If a real metric is in the text, use it. When a line needs a number the text doesn't have, insert a clearly-marked placeholder in square brackets — "[add %]", "[$ or #]", "[team size]", "[timeframe]" — for the user to fill with the truth. A résumé that fabricates wins gets the person caught in the interview; give them the frame, never a fake number.
SAFETY: improve the WRITING and the CHOICES; be specific and encouraging; never demean the person.
VOICE: warm, plain English, second person ("you"). Write like a friend who edits résumés for a living, not a consultant. Short sentences, no jargon, no scolding, no hype. Explain WHY a change works so they can apply the lesson to the parts you didn't touch — teaching them the pattern is worth more than the lines themselves.
QUOTING: whenever you repeat words from the résumé inside any field, wrap them in double quotes ("like this"). The app renders quoted text in bold so they can see exactly which words you mean.
${jd}`;
}

// Third 1 — the document itself: the score, the new summary, the rewrites.
export function buildGlowupRewritePrompt(target: GlowupTarget = {}): string {
  return `${glowupPreamble(target)}
SCORING: score_before is this résumé's GENUINE current hireability on 0-100 where higher = better (NOT a buzzword score — a clean, specific résumé scores high here). Assess honestly; do not default to a fixed number. score_after is realistic hireability once these exact fixes are applied — usually a lift of 15-40 points, never a fantasy 95+.
Respond with ONLY minified JSON — no prose, no markdown fences — in exactly this shape:
{"one_thing":"the single highest-leverage change, one punchy sentence","score_before":52,"score_after":81,"summary":"a 2-3 sentence professional summary, rewritten and ready to paste, truthful and specific to this person","narrative":"the one storyline every bullet should sell, one line","strengths":["a real asset already in this résumé, quoted, and why it works — something they should protect while editing"],"rewrites":[{"before":"a real weak/vague bullet quoted verbatim from the text","after":"the same bullet rewritten for impact, using [placeholders] for any number not in the source","why":"what changed and why it lands better, one plain sentence they can reuse on other bullets"}],"cut":[{"text":"filler to delete, quoted from the text","why":"why it hurts, one clause"}]}
COUNTS: strengths 2-3; rewrites exactly 5; cut 3-4. Keep every field concrete and tied to the actual text.`;
}

// Third 2 — how the page is read today, and the checklist for fixing it tonight.
export function buildGlowupStrategyPrompt(target: GlowupTarget = {}): string {
  return `${glowupPreamble(target)}
Respond with ONLY minified JSON — no prose, no markdown fences — in exactly this shape:
{"action_plan":[{"step":"the checklist line — an imperative naming the specific bullet or section, max 12 words","detail":"how to do it and what to write instead, quoting the résumé where useful","minutes":10}],"recruiter_read":["what a recruiter silently assumes seeing a SPECIFIC thing in this résumé, plus how to reframe it"],"ats_gaps":["\\"the exact missing keyword in double quotes\\" then a dash and why it matters, under 15 words"],"interview_landmines":["a pointed question THIS résumé invites that they should prep"]}
COUNTS: action_plan exactly 5, ordered highest-impact first, each "minutes" a realistic integer and the whole plan doable in one sitting; recruiter_read, ats_gaps, interview_landmines 2-3 each. action_plan "step" must be scannable — an imperative under 12 words that names a specific bullet, section or claim from THIS résumé ("Delete the duplicate Copilot project section", not "fix your bullets"); put every explanation in "detail" instead, max 55 words. Keep every field concrete and tied to the actual text.`;
}

// Third 3 — where this person goes next: what to build, where to aim, what to learn.
export function buildGlowupFuturePrompt(target: GlowupTarget = {}): string {
  return `${glowupPreamble(target)}
Respond with ONLY minified JSON — no prose, no markdown fences — in exactly this shape:
{"next_moves":{"roles":["a realistic next role","another"],"gaps":["a specific skill or experience to add to get there"]},"projects":[{"title":"a short project name","kind":"personal","what":"what to build or do, concrete enough to start this week, scoped to their actual level","bullet":"the résumé bullet this project earns once shipped, with [placeholders] for the numbers"}],"companies":[{"type":"the INDUSTRY + stage where THIS résumé competes well (e.g. 'Series B fintech scale-ups', 'enterprise healthtech SaaS')","why":"why this background lands there, one clause","examples":["2-4 REAL company names in that bucket — recognizable or fast-growing employers actually hiring such roles, never generic labels like 'startups' or 'consultancies'"]}],"roadmap":{"now":["a skill/tool to close BEFORE applying — the ones already blocking interviews"],"next":["the 3-6 month skills that create an edge for the target role"],"later":["the longer-game skills/tech that compound into seniority"]}}
COUNTS: next_moves.roles 2, next_moves.gaps 1-2; projects exactly 3 — at least one "kind":"personal" (a portfolio piece built outside work) and at least one "kind":"at-work" (a project to volunteer for INSIDE their current role, using the team/tools already in the résumé); companies 2-3, each with a distinct industry; roadmap.now/next/later 2-4 items each, each a named tool, skill or technology — never vague ("SQL window functions", not "improve data skills").
PROJECT WEIGHT — non-negotiable: every project must carry enterprise/industry-level weight — the kind a hiring panel at a serious company respects. Production-shaped: real or realistic data at meaningful scale, a deployed/demoable artifact, and at least one measurable dimension (evals, monitoring, latency, cost, adoption). Never a toy, tutorial clone, or listicle project ("build a to-do app"); each should read like work the TARGET ROLE does at the next tier, one notch above where this résumé is today. Projects and roadmap must fit the target role if one is given, and every item must be plausible from where this résumé actually is today. Keep every field concrete and tied to the actual text.`;
}

export function parseRoastJSON<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  let s = String(raw).trim().replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function isValidRoast(r: unknown): r is Roast {
  const o = r as Roast | null;
  return !!o && typeof o.cold_open === "string" && Array.isArray(o.roasts);
}

// Coerce whatever the model returned into the shape the UI renders. A line may
// come back as a bare string (the pre-fix shape, or a model that ignored the
// schema) — keep it as the burn rather than dropping the roast on the floor.
export function normalizeRoast(r: Roast): Roast {
  r.roasts = (Array.isArray(r.roasts) ? r.roasts : [])
    .map((line): RoastLine => {
      if (typeof line === "string") return { quote: "", burn: line, fix: "" };
      const l = line as Partial<RoastLine>;
      return {
        quote: typeof l.quote === "string" ? l.quote : "",
        burn: typeof l.burn === "string" ? l.burn : "",
        fix: typeof l.fix === "string" ? l.fix : "",
      };
    })
    .filter((l) => l.burn || l.fix);
  if (!r.roasts.length) r.roasts = fallbackRoast().roasts;
  if (!Array.isArray(r.strengths)) r.strengths = [];
  r.strengths = r.strengths.filter((s): s is string => typeof s === "string" && !!s.trim());
  if (!r.trajectory) r.trajectory = { satirical: "", real: "" };
  if (!Array.isArray(r.bento)) r.bento = [];
  if (!r.score || typeof r.score.value !== "number") r.score = fallbackRoast().score;
  return r;
}

export function fallbackRoast(): Roast {
  return {
    cold_open:
      "Let's see what we're working with… ah. A document that confidently says nothing, in Calibri.",
    roasts: [
      {
        quote: "a passion for synergy",
        burn: '"a passion for synergy." Three words in and you\'ve described every human who has ever held a job. Bold.',
        fix: "Swap it for the one thing you're actually known for. What would a teammate say you're the go-to person for? Write that.",
      },
      {
        quote: "Microsoft Office",
        burn: 'You listed "Microsoft Office" as a skill. We were genuinely worried a grown adult couldn\'t open a Word doc. Crisis averted.',
        fix: "Delete it and use the line for a tool that actually separates you — the one you'd be comfortable being quizzed on.",
      },
      {
        quote: "Responsible for",
        burn: 'Every bullet opens with "Responsible for…" — a tidy list of things that happened near you, not things you did.',
        fix: "Start each bullet with what you did and end with what changed: \"Cut invoice errors by [add the %] by rebuilding the checklist.\"",
      },
      {
        quote: "Familiar with Python",
        burn: '"Familiar with Python." That adverb is carrying an entire engineering degree on its back. Respect to it.',
        fix: "Either name what you built with it, or move it to a short \"Learning\" line. Hedged skills read as skills you can't defend.",
      },
    ],
    strengths: [
      'You do have real range — "project coordination" next to hands-on tooling is a genuinely useful combination. Say it out loud instead of burying it.',
      "Your bullets are short and scannable. That's rarer than you think — you just need results inside them, not more words.",
    ],
    trajectory: {
      satirical:
        "At your current rate of “spearheading cross-functional initiatives,” you're four years from LinkedIn thought leader and exactly zero years from anyone reading your posts.",
      real: "You've clearly delivered — the page just hides it behind task-language. Turn three “responsible for” bullets into “what changed because of me, with a number,” and you jump a tier of callbacks.",
    },
    dark_insight:
      "The two-year gap is the single most honest thing on this page. We respect it deeply. The ATS bot, tragically, has no soul.",
    verdict:
      "A competent person hiding behind a committee's vocabulary — the talent's in there, the résumé just refuses to say so.",
    bento: [
      { term: "Synergy", tag: "Filler", emoji: "🗑️" },
      { term: "Microsoft Office", tag: "Nope", emoji: "🙅" },
      { term: "Familiar with Python", tag: "Bless", emoji: "🐍" },
      { term: "Results-driven", tag: "Cliché", emoji: "🥱" },
      { term: "Team player", tag: "Which?", emoji: "🤷" },
      { term: "Responsible for", tag: "Passive", emoji: "😴" },
    ],
    score: { value: 82, grade: "F", label: "Certified Corporate" },
  };
}

// Backfill any missing field from the fallback so a partial model response can
// never crash the richer Glow-Up UI. Field-wise on purpose: the two halves are
// generated by separate calls, so if one fails the user still gets everything
// the other produced rather than a wholly canned report.
export function normalizeGlowup(g: Partial<Glowup> | null | undefined): Glowup {
  const fb = fallbackGlowup();
  if (!g) return fb;
  const arr = <T,>(v: unknown, fallback: T[]): T[] =>
    Array.isArray(v) && v.length ? (v as T[]) : fallback;

  return {
    one_thing: g.one_thing || fb.one_thing,
    summary: g.summary || fb.summary,
    narrative: g.narrative || fb.narrative,
    score_before: typeof g.score_before === "number" ? g.score_before : fb.score_before,
    score_after: typeof g.score_after === "number" ? g.score_after : fb.score_after,
    strengths: arr(g.strengths, fb.strengths),
    // A rewrite missing its `why` still renders — the UI just skips the lesson row.
    rewrites: arr(g.rewrites, fb.rewrites).map((r) => ({
      before: r?.before ?? "",
      after: r?.after ?? "",
      why: typeof r?.why === "string" ? r.why : "",
    })),
    action_plan: arr(g.action_plan, fb.action_plan).map((a) => ({
      step: a?.step ?? "",
      detail: typeof a?.detail === "string" ? a.detail : "",
      minutes: Number(a?.minutes) || 0,
    })),
    cut: arr(g.cut, fb.cut),
    next_moves: g.next_moves?.roles ? g.next_moves : fb.next_moves,
    recruiter_read: arr(g.recruiter_read, fb.recruiter_read),
    ats_gaps: arr(g.ats_gaps, fb.ats_gaps),
    interview_landmines: arr(g.interview_landmines, fb.interview_landmines),
    projects: arr(g.projects, fb.projects),
    companies: arr(g.companies, fb.companies),
    roadmap: Array.isArray(g.roadmap?.now)
      ? {
          now: arr(g.roadmap.now, fb.roadmap.now),
          next: arr(g.roadmap.next, fb.roadmap.next),
          later: arr(g.roadmap.later, fb.roadmap.later),
        }
      : fb.roadmap,
  };
}

export function fallbackGlowup(): Glowup {
  return {
    one_thing:
      "Every bullet describes a task you were near, not a result you caused — rewrite each to end in an outcome.",
    score_before: 41,
    score_after: 74,
    summary:
      "Operations-minded builder who turns messy, manual processes into systems people actually keep using. Owns problems end to end and leaves them measurably better than they were found.",
    narrative:
      "I take chaos and turn it into a repeatable system — every bullet should prove that once.",
    strengths: [
      "You've clearly owned messy, cross-team work end to end. That's the hard part, and most people can't claim it honestly.",
      "Your bullets are short. Keep that — you're adding numbers, not paragraphs.",
    ],
    rewrites: [
      { before: "Responsible for various tasks related to project coordination",
        after: "Coordinated [number] cross-team projects, cutting delivery slippage from [X] to [Y] weeks.",
        why: '"Responsible for" describes a job description; "Coordinated… cutting…" describes you. Lead with the verb, end with what moved.' },
      { before: "Utilized Microsoft Office to complete deliverables",
        after: "Built the reporting templates the team still uses — saved ~[hrs/week] across [team size] people.",
        why: "Tools aren't achievements. What you made with the tool — and the fact people still use it — is the achievement." },
      { before: "Helped improve the process that made things better",
        after: "Redesigned the intake process, raising on-time completion from [X]% to [Y]%.",
        why: '"Helped" hides your role and "better" hides the size. Name what you changed, then show the before-and-after number.' },
      { before: "Worked with stakeholders on various initiatives",
        after: "Partnered with [teams] to ship [initiative] — [the measurable result, add the number].",
        why: '"Various initiatives" could mean anything, so a reader assumes the smallest version. One named project beats five vague ones.' },
      { before: "Handled customer queries and support",
        after: "Resolved [#]/week support tickets at [X]% CSAT and cut repeat tickets [Y]% by fixing root causes.",
        why: "Volume shows scale, quality shows skill, and the root-cause clause shows you think past the ticket. Three signals, one line." },
    ],
    action_plan: [
      {
        step: "Paste in the new summary at the top",
        detail: "It reframes everything a recruiter reads after it. Three lines of context beats a page of guessing.",
        minutes: 5,
      },
      {
        step: "Dig out the real numbers for your three best results",
        detail: "Old dashboards, Slack threads, invoices — wherever they live. You only need three you'd be happy to defend.",
        minutes: 20,
      },
      {
        step: "Rewrite the five bullets above",
        detail: "Fill every [bracket] with a number you could explain in an interview. If you genuinely don't have one, cut the claim instead of guessing.",
        minutes: 25,
      },
      {
        step: "Delete everything on the cut list",
        detail: "Reclaim the space for one more result. A shorter résumé that says something beats a full one that doesn't.",
        minutes: 5,
      },
      {
        step: "Read the whole thing out loud once",
        detail: "Anything you'd be embarrassed to say to a hiring manager comes out. That test catches more than a spellchecker.",
        minutes: 5,
      },
    ],
    cut: [
      { text: "Microsoft Office", why: "assumed for any office role; signals nothing" },
      { text: "Team player who also works independently", why: "contradicts itself and says nothing" },
      { text: "Results-driven, passionate professional", why: "every résumé claims it; recruiters skim past" },
      { text: "References available on request", why: "so is everything — it wastes a line" },
    ],
    next_moves: {
      roles: ["Operations Lead", "Program / Project Manager"],
      gaps: ["one bullet showing budget or headcount ownership", "a quantified, named outcome you can defend in an interview"],
    },
    recruiter_read: [
      "Task-language reads as 'IC who hasn't owned outcomes' — reframe each bullet around the result to read as someone who drives them.",
      "No numbers anywhere reads as 'nothing here is measurable' — one real metric flips that instantly.",
    ],
    ats_gaps: [
      'The exact job title you\'re applying for — screening tools match on the literal words in the posting.',
      'The core tools for that role, named in full ("Microsoft Excel", not "Office") so a keyword search finds them.',
    ],
    interview_landmines: [
      "\"Walk me through a result you're proud of\" — every bullet is a duty, so prep one story with a real number.",
      "The gap between titles invites \"what happened here?\" — have a confident one-line framing ready.",
    ],
    projects: [
      {
        title: "The Ops Dashboard",
        kind: "personal",
        what: "Take one messy spreadsheet process you know well and rebuild it as a live dashboard (Sheets + Apps Script, or Airtable) that updates itself.",
        bullet: "Built a self-updating ops dashboard that replaced [hrs/week] of manual reporting for [team size] people.",
      },
      {
        title: "Own one metric at work",
        kind: "at-work",
        what: "Volunteer to own a single recurring metric your team already reports — define it, automate its collection, present it monthly.",
        bullet: "Owned [metric] end to end — automated collection and improved it from [X] to [Y] in [timeframe].",
      },
      {
        title: "The process teardown",
        kind: "personal",
        what: "Write a 1-page public teardown of a broken process you fixed (or would fix) — the before, the change, the number.",
        bullet: "Published a process-improvement case study that [result — add the number].",
      },
    ],
    companies: [
      {
        type: "Mid-size companies scaling operations",
        why: "chaos-to-system stories land hardest where the chaos is fresh",
        examples: ["growth-stage startups", "regional logistics firms", "D2C brands"],
      },
      {
        type: "Larger firms hiring process owners",
        why: "your coordination background reads as safe hands for an owned process",
        examples: ["established enterprises", "consultancies", "shared-services teams"],
      },
    ],
    roadmap: {
      now: ["Excel → real formulas + pivot fluency", "one dashboard tool (Looker Studio / Power BI)"],
      next: ["SQL basics — enough to pull your own numbers", "process mapping (SIPOC / swimlanes)"],
      later: ["light automation (Zapier / Apps Script / Python)", "project cert that matches the target role (CAPM / CSM)"],
    },
  };
}
