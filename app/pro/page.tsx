import type { Metadata } from "next";
import ProMatch from "@/components/pro/ProMatch";

export const metadata: Metadata = {
  title: "BurntCV Pro — see how the screen reads you 🎯",
  description:
    "Paste a job description and your résumé. See exactly how an AI screener scores you against that role — requirement by requirement, with quotes — and what to fix. Nothing stored, ever.",
  openGraph: {
    title: "BurntCV Pro — see how the screen reads you",
    description:
      "The same engine recruiters use to screen you, pointed the other way. Per-requirement scores, the exact lines that helped or hurt, and honest fixes.",
  },
};

export default function ProPage() {
  return <ProMatch />;
}
