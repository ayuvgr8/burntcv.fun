import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://burntcv.fun";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "BurntCV — get your résumé roasted 🔥",
  description:
    "Your résumé says 'passionate self-starter.' It's lying. First roast free — go unhinged. We don't save your CV, or your feelings.",
  keywords: [
    "resume roast generator",
    "roast my cv",
    "linkedin roast",
    "resume roaster",
    "ai resume feedback",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "BurntCV",
    title: "BurntCV — get your résumé roasted 🔥",
    description:
      "First roast free. 6 roasters, 3 heat levels — go unhinged. We don't save your CV — or your feelings.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BurntCV — get your résumé roasted 🔥",
    description:
      "First roast free. Go unhinged. We don't save your CV — or your feelings.",
    creator: "@iamayuv",
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
        <Analytics />
      </body>
    </html>
  );
}
