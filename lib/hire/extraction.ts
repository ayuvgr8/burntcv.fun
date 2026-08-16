// Shared shape-guard over the résumé-extraction JSON — used by BOTH products:
// the Hire pipeline (server-held candidate records) and Pro (stateless,
// client-round-tripped). Anything missing becomes an empty/neutral value
// rather than a crash or an invention; a fact without its evidence span is
// dropped (no evidence, no fact).

import type { ResumeExtraction } from "./types";

const clamp01 = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;

export function sanitizeExtraction(raw: unknown): ResumeExtraction {
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const arr = <T>(v: unknown, map: (item: Record<string, unknown>) => T): T[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
          .map(map)
      : [];
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const numOrNull = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  return {
    candidateName: typeof d.candidateName === "string" ? d.candidateName : null,
    totalYearsExperience: numOrNull(d.totalYearsExperience),
    skills: arr(d.skills, (s) => ({
      name: str(s.name),
      lastUsedYear: numOrNull(s.lastUsedYear),
      yearsUsed: numOrNull(s.yearsUsed),
      evidence: str(s.evidence),
      confidence: clamp01(s.confidence),
    })).filter((s) => s.name && s.evidence), // no evidence, no fact
    roles: arr(d.roles, (r) => ({
      title: str(r.title),
      org: str(r.org),
      start: typeof r.start === "string" ? r.start : null,
      end: typeof r.end === "string" ? r.end : null,
      durationMonths: numOrNull(r.durationMonths),
      highlights: strArr(r.highlights),
      evidence: str(r.evidence),
    })),
    education: arr(d.education, (e) => ({
      degree: str(e.degree),
      field: str(e.field),
      institution: str(e.institution),
      year: numOrNull(e.year),
      evidence: str(e.evidence),
    })),
    certifications: arr(d.certifications, (c) => ({
      name: str(c.name),
      year: numOrNull(c.year),
      evidence: str(c.evidence),
    })),
    workAuthSignals: strArr(d.workAuthSignals),
    extractionConfidence: clamp01(d.extractionConfidence),
    unparsedSections: strArr(d.unparsedSections),
  };
}
