// BurntCV Hire — plan limits and retention, config-driven (env-overridable)
// per PRD-Hire §18: do not hard-code pricing/limits into behavior.

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// v0 pilot limits (free tier). Billing/plans arrive with M5+ pricing decisions.
export const HIRE_LIMITS = {
  maxRolesPerAccount: envInt("HIRE_MAX_ROLES", 5),
  maxCandidatesPerRole: envInt("HIRE_MAX_CANDIDATES_PER_ROLE", 5),
  // Metering unit per PRD §18: candidate-screens. Monthly cap per account.
  screensPerMonth: envInt("HIRE_SCREENS_PER_MONTH", 25),
  maxJdChars: envInt("HIRE_MAX_JD_CHARS", 20000),
  maxResumeChars: envInt("HIRE_MAX_RESUME_CHARS", 24000),
};

// DPDP retention: candidate data auto-purges this many days after intake
// (default 180 per PRD §15.4), account-configurable within [7, 365].
export const RETENTION_DAYS_DEFAULT = envInt("HIRE_RETENTION_DAYS", 180);
export const RETENTION_DAYS_MIN = 7;
export const RETENTION_DAYS_MAX = 365;

export function clampRetentionDays(days: number): number {
  if (!Number.isFinite(days)) return RETENTION_DAYS_DEFAULT;
  return Math.min(RETENTION_DAYS_MAX, Math.max(RETENTION_DAYS_MIN, Math.floor(days)));
}
