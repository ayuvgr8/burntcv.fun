// Business operator identity — the legal entity that runs BurntCV and is the
// merchant of record for all Razorpay charges. Displayed on the policy pages
// (Terms, Privacy, Refund, Contact) and the site footer, which Razorpay
// requires for merchant activation.
//
// Everything is overridable via env so the same build can front a different
// legal entity or support inbox without a code change.

export const OPERATOR = {
  /** Registered business name — the merchant of record. */
  legalName: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "Quvon Labs",
  /** Consumer-facing brand. */
  brand: "BurntCV",
  city: process.env.NEXT_PUBLIC_OPERATOR_CITY ?? "Bangalore",
  state: process.env.NEXT_PUBLIC_OPERATOR_STATE ?? "Karnataka",
  country: process.env.NEXT_PUBLIC_OPERATOR_COUNTRY ?? "India",
  /** Working support inbox — must be reachable for payment compliance. */
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "quvonlabs@gmail.com",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://burntcv.fun",
} as const;

/** "Bangalore, Karnataka, India" — for the footer and contact block. */
export const OPERATOR_LOCATION = [
  OPERATOR.city,
  OPERATOR.state,
  OPERATOR.country,
].join(", ");

/** Bare host ("burntcv.fun") for display next to the full URL. */
export const OPERATOR_HOST = OPERATOR.siteUrl.replace(/^https?:\/\//, "");

/** Stable "last updated" date shown on every policy page. */
export const POLICY_UPDATED = "4 July 2026";
