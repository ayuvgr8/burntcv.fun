/** @type {import('next').NextConfig} */

// Security headers. CSP allows: our own origin; inline styles (the design is
// inline-styled); Anthropic (BYOK calls the API directly from the browser);
// Fontshare (Satoshi); Vercel Analytics; data/blob images (html2canvas export).
// Framing is restricted to SAME-ORIGIN ('self'): cross-origin sites still can't
// frame us (clickjacking stays blocked), but our own footer pop-up can embed
// the policy pages (via ?embed=1). 'self' in frame-src lets us frame them.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' https://api.fontshare.com https://cdn.fontshare.com",
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://checkout.razorpay.com",
  "connect-src 'self' https://api.anthropic.com https://api.fontshare.com https://cdn.fontshare.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://api.razorpay.com https://lumberjack.razorpay.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the tracing root to this app (a parent lockfile exists on this machine).
  outputFileTracingRoot: import.meta.dirname,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
