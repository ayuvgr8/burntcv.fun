import type { Metadata } from "next";
import HireLanding from "@/components/hire/HireLanding";

export const metadata: Metadata = {
  title: "BurntCV Hire — AI recruiting that shows its work",
  description:
    "Screen résumés against your job description with evidence-cited, per-requirement fit reports. Every score backed by a quote, every decision made by a human. DPDP-first.",
  openGraph: {
    title: "BurntCV Hire — AI recruiting that shows its work",
    description:
      "Evidence-cited résumé screening for recruiters. Per-requirement scores with quoted proof, gap-targeted interview questions, and a full audit trail.",
  },
};

export default function HirePage() {
  return <HireLanding />;
}
