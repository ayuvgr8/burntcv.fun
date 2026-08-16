// BurntCV Hire — shared types for the decision-support screening engine.
//
// The single most important design decision (PRD-Hire §6): the LLM only ever
// (a) structures text and (b) rates one requirement at a time with cited
// evidence. The verdict — weighting, aggregation, band — is pure code in
// lib/hire/engine.ts. Nothing in these types carries an "LLM overall score".

export type ReqCategory = "MUST_HAVE" | "PREFERRED" | "IMPLICIT";
export type ReqSource = "AI" | "RECRUITER";
export type RoleStatus = "OPEN" | "CLOSED";
export type FitBand = "STRONG" | "POSSIBLE" | "WEAK" | "INSUFFICIENT_EVIDENCE";
export type DecisionOutcome = "ADVANCE" | "HOLD" | "PASS";
export type ConsentBasis = "candidate_application" | "recruiter_attestation";

// Candidate pipeline stages, advanced one step per /process call so every
// stage fits comfortably inside a serverless timeout (no queue infra needed
// for 1–5 candidates/role in v0):
//   new → extracted → rated → scored   (happy path)
//   any failure after retry → review   (never silently dropped)
export type CandidateStage = "new" | "extracted" | "rated" | "scored" | "review";

export interface HireAccount {
  id: string;
  orgName: string;
  ownerEmail: string;
  dpdpAccepted: boolean;
  retentionDays: number; // candidate data auto-purges this many days after intake
  createdAt: number;
}

// One weighted, recruiter-editable criterion. `isKnockout` can ONLY become
// true via the recruiter's requirements-confirm call — the AI may merely
// suggest (`knockoutSuggested`). That is the PRD's "human defines the bar"
// gate, enforced structurally.
export interface Requirement {
  id: string;
  label: string;
  category: ReqCategory;
  weight: number; // 1..10, recruiter-editable
  isKnockout: boolean;
  knockoutSuggested: boolean;
  detail: string; // what good evidence looks like (feeds the rating rubric)
  rationale: string; // why this was extracted from the JD
  source: ReqSource;
  orderIndex: number;
}

export interface Role {
  id: string;
  accountId: string;
  title: string;
  jdRawText: string;
  seniority: string;
  decompositionNotes: string;
  requirements: Requirement[];
  confirmed: boolean; // recruiter has reviewed/edited weights — scoring is gated on this
  // Bumped every time the CONFIRMED bar is edited again. Candidates record the
  // version they were scored against, so a report can never silently drift
  // from the weights it claims to reflect (absent on old records → 1).
  barVersion?: number;
  status: RoleStatus;
  createdBy: string; // email of the recruiter
  createdAt: number;
}

// ---- résumé extraction (LLM output, stored with provenance) ----

export interface SkillItem {
  name: string;
  lastUsedYear: number | null;
  yearsUsed: number | null;
  evidence: string; // verbatim résumé line — no evidence, no fact
  confidence: number; // 0..1
}

export interface WorkItem {
  title: string;
  org: string;
  start: string | null; // "YYYY-MM"
  end: string | null; // "YYYY-MM" | "present"
  durationMonths: number | null;
  highlights: string[];
  evidence: string;
}

export interface EducationItem {
  degree: string;
  field: string;
  institution: string;
  year: number | null;
  evidence: string;
}

export interface CertItem {
  name: string;
  year: number | null;
  evidence: string;
}

export interface ResumeExtraction {
  candidateName: string | null;
  totalYearsExperience: number | null;
  skills: SkillItem[];
  roles: WorkItem[];
  education: EducationItem[];
  certifications: CertItem[];
  workAuthSignals: string[];
  extractionConfidence: number; // 0..1
  unparsedSections: string[];
}

// ---- per-requirement rating (LLM output) ----

export interface DimensionScore {
  requirementId: string;
  score: number | null; // 0..4 rubric; null = N/A (insufficient evidence to assess)
  supportingEvidence: string[]; // verbatim résumé spans; required for any score >= 1
  contradictingEvidence: string[];
  reasoning: string;
  confidence: number; // 0..1
}

// ---- deterministic verdict (engine output — pure code, no LLM) ----

export interface Gap {
  requirementId: string;
  label: string;
  severity: "missing" | "partial";
  note: string;
}

export interface InterviewQuestion {
  requirementId: string;
  question: string;
  whatGoodLooksLike: string;
  whatWeakLooksLike: string;
}

export interface FitReport {
  overallScore: number; // 0..100, deterministic weighted mean
  band: FitBand;
  dimensionScores: DimensionScore[];
  gaps: Gap[];
  interviewQuestions: InterviewQuestion[];
  knockoutFailures: string[]; // requirementIds — surfaced prominently, never auto-actioned
  needsReview: boolean; // low confidence → human must look
  confidence: number; // 0..1 combined extraction + rating confidence
  engineVersion: string;
  modelVersions: Record<string, string>; // stage → model actually used
  createdAt: number;
}

// The accountable human action. There is no code path that writes one of
// these without a recruiter email from a verified session (PRD-Hire §15.1).
export interface HireDecision {
  outcome: DecisionOutcome;
  note: string;
  decidedBy: string; // recruiter email from the session
  decidedAt: number;
}

export interface ConsentInfo {
  basis: ConsentBasis;
  purpose: "role_screening";
  attestedBy: string; // recruiter email
  attestedAt: number;
}

export interface Candidate {
  id: string;
  accountId: string;
  roleId: string;
  displayName: string;
  resumeText: string;
  stage: CandidateStage;
  stageError: string | null; // set when stage === "review"
  extraction: ResumeExtraction | null;
  ratings: DimensionScore[] | null; // raw LLM ratings, kept for audit
  fitReport: FitReport | null;
  decision: HireDecision | null;
  consent: ConsentInfo;
  modelVersions: Record<string, string>; // stage → model, accumulated as the pipeline runs
  barVersion?: number; // the Role.barVersion this candidate's report was scored against
  createdAt: number;
  purgeAfter: number; // epoch ms — retention deadline, enforced via storage TTL + lazy filter
}

// Append-only audit trail (per account).
export interface AuditEvent {
  id: string;
  at: number;
  actor: string | null; // recruiter email, null for system actions (e.g. purge)
  action: string; // "role.created" | "candidate.scored" | "candidate.decided" | "data.deleted" ...
  targetType: string;
  targetId: string;
  meta: Record<string, unknown>;
}
