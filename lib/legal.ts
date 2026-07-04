// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for BurntCV's business + legal details.
// Every policy page (Terms, Privacy, Refund, Contact) and the site footer read
// from here — edit these values ONCE.
//
// The `entityName` must match your PAN name / GST legal name / bank-account
// name *exactly*, or Razorpay activation (and settlements) will be held up.
// ─────────────────────────────────────────────────────────────────────────

export const LEGAL = {
  brand: "BurntCV",
  siteUrl: "https://burntcv.fun",

  // Your legal operating entity. Must match your Razorpay account name / bank
  // account / PAN or GST registration exactly.
  entityName: "Quvon Labs",
  // Confirm this matches your Razorpay account type (Individual / Sole
  // Proprietorship / Private Limited).
  entityType: "Sole Proprietorship",

  // Physical address. Razorpay verifies this — add full street + PIN before
  // final KYC submission.
  address: "Bangalore, Karnataka, India",

  // Contact inboxes.
  supportEmail: "quvonlabs@gmail.com",
  grievanceEmail: "quvonlabs@gmail.com",

  // Only if GST-registered; leave "" otherwise.
  gstin: "",

  // Where disputes are governed.
  jurisdiction: "Bangalore, Karnataka, India",

  effectiveDate: "4 July 2026",
} as const;

export type Legal = typeof LEGAL;
