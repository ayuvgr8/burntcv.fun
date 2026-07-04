import type { Metadata } from "next";
import LegalPage, { Section } from "@/components/LegalPage";
import { OPERATOR, OPERATOR_LOCATION, OPERATOR_HOST } from "@/lib/operator";

export const metadata: Metadata = {
  title: "Terms & Conditions — BurntCV",
  description: `The terms governing your use of ${OPERATOR.brand}, operated by ${OPERATOR.legalName}.`,
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro={
        <>
          These Terms govern your use of {OPERATOR.brand} ({OPERATOR_HOST}), a
          service operated by {OPERATOR.legalName}, {OPERATOR_LOCATION}. By using
          the service you agree to them.
        </>
      }
    >
      <Section title="1. What BurntCV is">
        <p>
          {OPERATOR.brand} is an entertainment and feedback tool that uses AI to
          generate a satirical &ldquo;roast&rdquo; and constructive commentary on
          a résumé or LinkedIn profile text you provide. Output is generated for
          humour and general feedback only — it is not career, legal, financial,
          or professional advice, and no specific outcome (interviews, offers, or
          results of any kind) is promised or guaranteed.
        </p>
      </Section>

      <Section title="2. Who can use it">
        <p>
          You must be at least 18 years old, or the age of majority in your
          jurisdiction, to make a purchase. You are responsible for keeping any
          restore code or account access under your control.
        </p>
      </Section>

      <Section title="3. Your content">
        <p>
          You submit résumé or profile text (&ldquo;Input&rdquo;) only if you own
          it or are authorised to submit it. You retain all rights to your Input.
          You grant {OPERATOR.legalName} a limited licence to process your Input
          for the sole purpose of generating your result. We do not store your
          résumé — see our Privacy Policy.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to use {OPERATOR.brand} to:</p>
        <p>
          — submit content you have no right to submit, or that infringes another
          person&apos;s rights;
          <br />
          — attempt to reverse-engineer, scrape, overload, or disrupt the service
          or its rate limits;
          <br />
          — resell or redistribute the service or its output as your own product.
        </p>
      </Section>

      <Section title="5. Payments">
        <p>
          Paid roasts and passes are billed in Indian Rupees through our payment
          processor, Razorpay. {OPERATOR.legalName} is the merchant of record.
          Prices shown at checkout are inclusive of applicable taxes unless stated
          otherwise. Cancellations and refunds are governed by our Cancellation &
          Refund Policy.
        </p>
      </Section>

      <Section title="6. Intellectual property">
        <p>
          The {OPERATOR.brand} name, design, and software are owned by{" "}
          {OPERATOR.legalName}. The roast text generated for you is yours to share
          and use for personal, non-commercial purposes.
        </p>
      </Section>

      <Section title="7. Disclaimers & liability">
        <p>
          The service is provided &ldquo;as is&rdquo; without warranties of any
          kind. AI output may be inaccurate, incomplete, or unintentionally off —
          treat it as entertainment. To the maximum extent permitted by law,{" "}
          {OPERATOR.legalName}&apos;s total liability for any claim relating to the
          service is limited to the amount you paid for the specific transaction
          giving rise to the claim.
        </p>
      </Section>

      <Section title="8. Changes & governing law">
        <p>
          We may update these Terms from time to time; the &ldquo;last
          updated&rdquo; date reflects the current version. These Terms are
          governed by the laws of India, with courts at {OPERATOR.city},{" "}
          {OPERATOR.state} having jurisdiction.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a
            href={`mailto:${OPERATOR.email}`}
            style={{ color: "#4e3188", fontWeight: 600 }}
          >
            {OPERATOR.email}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
