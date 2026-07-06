import type { Metadata } from "next";
import Link from "next/link";
import FeedbackForm from "@/components/FeedbackForm";
import Footer from "@/components/Footer";
import { OPERATOR } from "@/lib/operator";

export const metadata: Metadata = {
  title: "Feedback — BurntCV",
  description: `Tell ${OPERATOR.brand} what to fix or build next.`,
  robots: { index: true, follow: true },
};

export default function FeedbackPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main
        style={{
          flex: 1,
          maxWidth: 620,
          width: "100%",
          margin: "0 auto",
          padding: "40px 22px 24px",
          boxSizing: "border-box",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "#0f0623",
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ fontSize: 20 }}>🔥</span> BurntCV
        </Link>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            margin: "26px 0 6px",
          }}
        >
          Tell us what you think.
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            color: "#5a5a5a",
            margin: "0 0 22px",
          }}
        >
          A bug, an idea, or just a reaction — it all helps decide what we build
          next. Takes 20 seconds.
        </p>

        <FeedbackForm />
      </main>
      <Footer />
    </div>
  );
}
