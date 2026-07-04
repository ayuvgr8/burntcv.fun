import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://burntcv.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "BurntCV — We read it so a recruiter doesn't have to suffer.",
  description:
    "Upload your résumé. Get roasted. Get the brutally honest, very funny truth your recruiter is too polite to say — your real career trajectory and one dark truth included. Under 30 seconds.",
  keywords: [
    "resume roast generator",
    "roast my cv",
    "linkedin roast",
    "resume roaster",
    "ai resume feedback",
  ],
  openGraph: {
    title: "BurntCV — get your résumé roasted 🔥",
    description:
      "I let an AI roast my résumé and I've never felt so seen 💀",
    siteName: "BurntCV",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BurntCV — get your résumé roasted 🔥",
    description: "I let an AI roast my résumé and I've never felt so seen 💀",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {/* Global footer — carries Terms / Privacy / Refund / Contact on every route. */}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
