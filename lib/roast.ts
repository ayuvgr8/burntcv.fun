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

export interface Roast {
  cold_open: string;
  roasts: string[];
  trajectory: { satirical: string; real: string };
  dark_insight: string;
  verdict: string;
  bento?: BentoItem[];
  score?: BuzzScore;
}

// Max characters of résumé text sent to the model. Covers a full 1–2 page CV.
// Measured cost at this cap ≈ ₹1–1.3 per roast on Sonnet 4.6.
export const INPUT_CHAR_CAP = 6000;

export interface Glowup {
  one_thing: string;
  score_before: number;
  score_after: number;
  summary: string;
  narrative: string;
  rewrites: { before: string; after: string }[];
  cut: { text: string; why: string }[];
  next_moves: { roles: string[]; gaps: string[] };
  recruiter_read: string[];
  ats_gaps: string[];
  interview_landmines: string[];
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
HARD SAFETY (constant, regardless of intensity): never mock protected characteristics (gender, race, age, religion, disability, nationality, appearance, health, orientation); never tell anyone they're worthless, hopeless, stupid, or should give up; the target is the document, the clichés, the choices — never the human's worth; if the text signals genuine distress, stay affectionate and make the 'real' read encouraging.
${target}
METHOD: first silently find the 4 most real weaknesses (vague impact-free bullets, missing metrics, cliché/buzzword density, over-claimed skills, narrative gaps, formatting tells). Then roast THOSE. Every line must quote or reference something ACTUALLY in the text — no generic horoscope lines.
VOICE: ${p.voice}.
INTENSITY: ${it.note}
Respond with ONLY minified JSON, no prose, no markdown fences, in exactly this shape:
{"cold_open":"one devastating opening line","roasts":["line1","line2","line3","line4"],"trajectory":{"satirical":"where this is headed if nothing changes, played completely straight","real":"the genuine insight underneath — the same flaw, honest and a little kind"},"dark_insight":"exactly ONE existential or absurdist line about work and the human condition, never a personal attack","verdict":"one-sentence summary judgement","score":{"value":72,"grade":"D","label":"a punchy 2-4 word verdict"},"bento":[{"term":"an exact word or phrase copied from the résumé","tag":"a ONE-word verdict on it","emoji":"one fitting emoji"}]}
roasts must be exactly 4 items. bento must be exactly 6 items — each "term" quoted verbatim from the text (a buzzword, cliché, skill, or bullet fragment), each "tag" a SINGLE word (e.g. Filler, Nope, Cringe, Bless, Vague, Padding), each "emoji" one character. score.value is an integer 0-100 measuring BUZZWORD DENSITY / cliché infestation (higher = more roastable); grade is a single letter A-F (A = clean and specific, F = a buzzword crime scene); label is a witty 2-4 word grade like "Certified Corporate" or "Recovering Synergist". Keep every field punchy.`;
}

export function buildGlowupPrompt(jobDescription?: string): string {
  const jd = jobDescription?.trim()
    ? `\nTARGET JOB — tailor summary, rewrites, and ats_gaps to THIS role specifically:\n${jobDescription.slice(0, 2000)}\n`
    : "";
  return `You are the BurntCV critic in HELPFUL mode. The roast is over — this is rehabilitation, and the user PAID for it, so it must feel like a genuine upgrade, not three tips. Keep a trace of the app's dry wit, but the substance has to be real: this is the part they paid for.
Work only from the résumé text provided. Every line must reference something ACTUALLY in it — a real bullet, a real gap, a real title. No generic career advice that could apply to anyone; that's the fastest way to feel like a refund.
INTEGRITY — non-negotiable: NEVER invent numbers, employers, job titles, tools, or achievements. Use only facts present in the input. If a real metric is in the text, use it. When a rewrite needs a number the text doesn't have, insert a clearly-marked placeholder in square brackets — "[add %]", "[$ or #]", "[team size]", "[timeframe]" — for the user to fill with the truth. A résumé that fabricates wins gets the person caught in the interview; give them the frame, never a fake number.
SCORING: score_before is this résumé's GENUINE current hireability on 0-100 where higher = better (NOT the roast's buzzword score — a clean, specific résumé scores high here). Assess honestly; do not default to a fixed number. score_after is realistic hireability once these exact fixes are applied — usually a lift of 15-40 points, never a fantasy 95+.
SAFETY: improve the WRITING and the CHOICES; be specific and encouraging; never demean the person.
${jd}
Respond with ONLY minified JSON — no prose, no markdown fences — in exactly this shape:
{"one_thing":"the single highest-leverage change, one punchy sentence","score_before":52,"score_after":81,"summary":"a 2-3 sentence professional summary, rewritten and ready to paste, truthful and specific to this person","narrative":"the one storyline every bullet should sell, one line","rewrites":[{"before":"a real weak/vague bullet quoted verbatim from the text","after":"the same bullet rewritten for impact, using [placeholders] for any number not in the source"}],"cut":[{"text":"filler to delete, quoted from the text","why":"why it hurts, one clause"}],"next_moves":{"roles":["a realistic next role","another"],"gaps":["a specific skill or experience to add to get there"]},"recruiter_read":["what a recruiter silently assumes seeing a SPECIFIC thing in this résumé, plus how to reframe it"],"ats_gaps":["a concrete keyword this résumé is missing that an ATS would filter on"],"interview_landmines":["a pointed question THIS résumé invites that they should prep"]}
COUNTS: rewrites exactly 5; cut 3-4; next_moves.roles 2, next_moves.gaps 1-2; recruiter_read, ats_gaps, interview_landmines 2-3 each. Keep every field concrete and tied to the actual text.`;
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

export function fallbackRoast(): Roast {
  return {
    cold_open:
      "Let's see what we're working with… ah. A document that confidently says nothing, in Calibri.",
    roasts: [
      "“…a passion for synergy.” Three words in and you've described every human who has ever held a job. Bold.",
      "You listed “Microsoft Office” as a skill. We were genuinely worried a grown adult couldn't open a Word doc. Crisis averted.",
      "Every bullet opens with “Responsible for…” — a tidy list of things that happened near you, not things you did.",
      "“Familiar with Python.” That adverb is carrying an entire engineering degree on its back. Respect to it.",
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
// never crash the richer Glow-Up UI (mirrors the roast route's bento/score).
export function normalizeGlowup(g: Glowup | null | undefined): Glowup {
  if (!g || !Array.isArray(g.rewrites)) return fallbackGlowup();
  const fb = fallbackGlowup();
  g.one_thing ??= fb.one_thing;
  g.summary ??= fb.summary;
  g.narrative ??= fb.narrative;
  g.cut ??= fb.cut;
  g.next_moves ??= fb.next_moves;
  g.recruiter_read ??= fb.recruiter_read;
  g.ats_gaps ??= fb.ats_gaps;
  g.interview_landmines ??= fb.interview_landmines;
  if (typeof g.score_before !== "number") g.score_before = fb.score_before;
  if (typeof g.score_after !== "number") g.score_after = fb.score_after;
  return g;
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
    rewrites: [
      { before: "Responsible for various tasks related to project coordination",
        after: "Coordinated [number] cross-team projects, cutting delivery slippage from [X] to [Y] weeks." },
      { before: "Utilized Microsoft Office to complete deliverables",
        after: "Built the reporting templates the team still uses — saved ~[hrs/week] across [team size] people." },
      { before: "Helped improve the process that made things better",
        after: "Redesigned the intake process, raising on-time completion from [X]% to [Y]%." },
      { before: "Worked with stakeholders on various initiatives",
        after: "Partnered with [teams] to ship [initiative] — [the measurable result, add the number]." },
      { before: "Handled customer queries and support",
        after: "Resolved [#]/week support tickets at [X]% CSAT and cut repeat tickets [Y]% by fixing root causes." },
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
      "the exact job-title keywords for the roles you're targeting",
      "the core tools/skills for that role, named explicitly",
    ],
    interview_landmines: [
      "\"Walk me through a result you're proud of\" — every bullet is a duty, so prep one story with a real number.",
      "The gap between titles invites \"what happened here?\" — have a confident one-line framing ready.",
    ],
  };
}
