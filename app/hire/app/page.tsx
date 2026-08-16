import type { Metadata } from "next";
import HireConsole from "@/components/hire/HireConsole";

export const metadata: Metadata = {
  title: "BurntCV Hire — Workspace",
  description: "Recruiter workspace: roles, candidates, evidence-cited fit reports.",
  robots: { index: false, follow: false }, // private app surface
};

export default function HireAppPage() {
  return <HireConsole />;
}
