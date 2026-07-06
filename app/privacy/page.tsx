import type { Metadata } from "next";
import LegalPage, { Section } from "@/components/LegalPage";
import { OPERATOR, OPERATOR_LOCATION } from "@/lib/operator";

export const metadata: Metadata = {
  title: "Privacy Policy — BurntCV",
  description: `How ${OPERATOR.legalName} handles your data on ${OPERATOR.brand}. We roast your résumé and forget it.`,
  robots: { index: true, follow: true },
};

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const embed = (await searchParams).embed === "1";
  return (
    <LegalPage
      title="Privacy Policy"
      embed={embed}
      intro={
        <>
          {OPERATOR.brand} is operated by {OPERATOR.legalName}, {OPERATOR_LOCATION}.
          Résumés are personal information, so we keep our handling of them
          deliberately minimal: your résumé is roasted and forgotten.
        </>
      }
    >
      <Section title="The short version">
        <p>
          We do not store your résumé or LinkedIn text. It is sent to our AI
          provider to generate your roast and is not retained by us afterwards.
          The roast output and your usage counters live only in your own
          browser&apos;s local storage — not on our servers.
        </p>
      </Section>

      <Section title="What we process, and why">
        <p>
          <strong>Résumé / profile text you submit.</strong> Processed once, in
          real time, purely to generate your result. Not stored by us after the
          response is returned.
        </p>
        <p>
          <strong>Roast output & usage counts.</strong> Saved in your
          browser&apos;s local storage on your device so the app remembers your
          history and free-roast usage. Clearing your browser data removes it.
        </p>
        <p>
          <strong>Payment information.</strong> When you pay, checkout is handled
          by Razorpay (in India) or Creem (internationally). Your card and payment
          details are entered on their systems — we never see or store your full
          card number. We receive only a payment confirmation and, for passes, an
          email you provide so we can restore your entitlement.
        </p>
        <p>
          <strong>Technical data.</strong> To prevent abuse and apply free-tier
          rate limits, we temporarily process your IP address. We also use
          privacy-friendly, aggregate analytics to understand overall usage.
        </p>
      </Section>

      <Section title="Bring-your-own-key mode">
        <p>
          If you use your own AI API key, your browser calls the AI provider
          directly and your key never touches our servers. We cannot see it.
        </p>
      </Section>

      <Section title="Who we share with">
        <p>
          We share data only with the service providers needed to run {OPERATOR.brand}:
          our AI model provider (to generate the roast), our payment processors
          Razorpay and Creem (to process payments), and our hosting and analytics
          providers. We do not sell your personal information.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          Résumé text is not retained after your roast is generated. Payment and
          entitlement records are kept as long as needed to honour your purchase
          and to meet legal, tax, and accounting obligations.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can clear your local roast history at any time by clearing your
          browser storage. For questions, or to request access to or deletion of
          any information we hold about a purchase, contact us at{" "}
          <a
            href={`mailto:${OPERATOR.email}`}
            style={{ color: "#4e3188", fontWeight: 600 }}
          >
            {OPERATOR.email}
          </a>
          .
        </p>
      </Section>

      <Section title="Contact">
        <p>
          {OPERATOR.legalName}
          <br />
          {OPERATOR_LOCATION}
          <br />
          {OPERATOR.email}
        </p>
      </Section>
    </LegalPage>
  );
}
