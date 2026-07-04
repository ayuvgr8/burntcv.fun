import type { Metadata } from "next";
import LinkedInLanding from "@/components/LinkedInLanding";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://burntcv.app";

export const metadata: Metadata = {
  title: "LinkedIn Roast Generator — Get your LinkedIn profile roasted | BurntCV",
  description:
    "Paste your LinkedIn profile and get a brutally honest, very funny roast of your headline, buzzwords, third-person About, and engagement bait. Free, instant, screenshot-ready. We never scrape — you paste it, we roast it, then forget it.",
  keywords: [
    "linkedin roast generator",
    "roast my linkedin",
    "linkedin profile roast",
    "linkedin headline roast",
    "roast my linkedin profile",
    "ai linkedin roast",
  ],
  alternates: { canonical: "/linkedin" },
  openGraph: {
    title: "LinkedIn Roast Generator 🔥 — roast your LinkedIn profile",
    description:
      "I let an AI roast my LinkedIn and I've never felt so seen 💀",
    url: `${SITE_URL}/linkedin`,
    siteName: "BurntCV",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Roast Generator 🔥",
    description: "I let an AI roast my LinkedIn and I've never felt so seen 💀",
  },
};

export default function LinkedInPage() {
  return <LinkedInLanding />;
}
