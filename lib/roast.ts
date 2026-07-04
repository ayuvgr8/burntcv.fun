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
  summary: string;
  rewrites: { before: string; after: string }[];
  cut: string[];
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
    label: "Medium",
    desc: "Properly sarcastic.",
    free: true,
    note: "Properly sarcastic — land real punches, still affectionate.",
  },
  {
    id: "unhinged",
    emoji: "💀",
    label: "Unhinged",
    desc: "No mercy. Max satire.",
    free: true,
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

export function buildGlowupPrompt(): string {
  return `You are the BurntCV critic in HELPFUL mode. The roast is done; now fix it with taste — same flaws, concrete improvements.
Respond with ONLY minified JSON, no prose, no fences: {"summary":"the single narrative thread this résumé is missing, 1-2 sentences","rewrites":[{"before":"a real weak/vague bullet pulled from the text","after":"the same bullet rewritten to show impact, with a number"}],"cut":["filler 1 to delete","filler 2","filler 3"]}
rewrites must be exactly 3 items, specific to the actual text.`;
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

export function fallbackGlowup(): Glowup {
  return {
    summary:
      "You're an operator who turns mess into systems — but every bullet is a task, not a transformation. Pick that one storyline and make every line serve it.",
    rewrites: [
      {
        before: "Responsible for various tasks related to project coordination",
        after:
          "Coordinated 3 cross-team projects, cutting delivery slippage from 6 weeks to 2.",
      },
      {
        before: "Utilized Microsoft Office to complete deliverables",
        after:
          "Built the reporting templates the team still uses — saved ~4 hrs/week across 8 people.",
      },
      {
        before: "Helped improve the process that made things better",
        after:
          "Redesigned the intake process, raising on-time completion from 71% to 94%.",
      },
    ],
    cut: [
      "Microsoft Office",
      "Team player + works independently",
      "Passionate / Hard worker",
      "Results-driven professional",
    ],
  };
}
