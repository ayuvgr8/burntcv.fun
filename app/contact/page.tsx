import type { Metadata } from "next";
import LegalPage, { Section } from "@/components/LegalPage";
import { OPERATOR, OPERATOR_LOCATION } from "@/lib/operator";

export const metadata: Metadata = {
  title: "Contact Us — BurntCV",
  description: `Get in touch with ${OPERATOR.legalName}, the team behind ${OPERATOR.brand}.`,
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact Us"
      intro={
        <>
          Questions, payment issues, or feedback on your roast? {OPERATOR.legalName}
          {" "}runs {OPERATOR.brand} and we&apos;re happy to help.
        </>
      }
    >
      <Section title="Email">
        <p>
          <a
            href={`mailto:${OPERATOR.email}`}
            style={{ color: "#4e3188", fontWeight: 700, fontSize: "18px" }}
          >
            {OPERATOR.email}
          </a>
        </p>
        <p>
          We aim to respond within 2 business days. For refund or payment
          questions, include your order/payment reference so we can find your
          transaction quickly.
        </p>
      </Section>

      <Section title="Business operator">
        <p>
          {OPERATOR.legalName}
          <br />
          {OPERATOR_LOCATION}
        </p>
      </Section>

      <Section title="Policies">
        <p>
          See our{" "}
          <a href="/terms" style={{ color: "#4e3188", fontWeight: 600 }}>
            Terms
          </a>
          ,{" "}
          <a href="/privacy" style={{ color: "#4e3188", fontWeight: 600 }}>
            Privacy Policy
          </a>
          ,{" "}
          <a href="/refund" style={{ color: "#4e3188", fontWeight: 600 }}>
            Cancellation & Refund Policy
          </a>
          , and{" "}
          <a href="/shipping" style={{ color: "#4e3188", fontWeight: 600 }}>
            Shipping & Delivery Policy
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
