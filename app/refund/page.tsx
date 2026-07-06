import type { Metadata } from "next";
import LegalPage, { Section } from "@/components/LegalPage";
import { OPERATOR, OPERATOR_LOCATION } from "@/lib/operator";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy — BurntCV",
  description: `Cancellation and refund terms for ${OPERATOR.brand}, operated by ${OPERATOR.legalName}.`,
  robots: { index: true, follow: true },
};

export default async function RefundPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const embed = (await searchParams).embed === "1";
  return (
    <LegalPage
      title="Cancellation & Refund Policy"
      embed={embed}
      intro={
        <>
          This policy covers purchases made on {OPERATOR.brand}, operated by{" "}
          {OPERATOR.legalName}, {OPERATOR_LOCATION}. Because roasts are digital
          content delivered instantly, please read this before you buy.
        </>
      }
    >
      <Section title="Digital product, delivered instantly">
        <p>
          {OPERATOR.brand} sells digital services — a single roast, a top-up
          roast, or a time-limited pass. These are delivered to you immediately
          and electronically once payment succeeds. There is no physical product
          and nothing is shipped.
        </p>
      </Section>

      <Section title="Cancellation">
        <p>
          A single roast or top-up is fulfilled the moment it is generated and
          cannot be cancelled after that. A pass may be cancelled at any time to
          stop future use; a pass is a one-time purchase (not an
          auto-renewing subscription), so there is nothing to unsubscribe from and
          you are never charged again automatically.
        </p>
      </Section>

      <Section title="Refunds">
        <p>
          Once a roast has been generated and delivered, the service has been
          consumed and is generally non-refundable.
        </p>
        <p>
          However, we want you to be treated fairly. We will issue a full refund
          if:
        </p>
        <p>
          — you were charged but, due to a technical error on our side, no roast
          or pass was delivered;
          <br />
          — you were charged more than once for the same purchase (duplicate
          charge); or
          <br />
          — the service was materially unavailable at the time of your purchase.
        </p>
      </Section>

      <Section title="How to request a refund">
        <p>
          Email{" "}
          <a
            href={`mailto:${OPERATOR.email}`}
            style={{ color: "#4e3188", fontWeight: 600 }}
          >
            {OPERATOR.email}
          </a>{" "}
          within 7 days of the charge with your payment/order reference and a
          short description of the issue. We aim to respond within 2 business days.
        </p>
      </Section>

      <Section title="How refunds are processed">
        <p>
          Approved refunds are made to the original payment method through
          Razorpay. Once processed, it typically takes 5–7 business days for the
          amount to reflect in your account, depending on your bank or card
          issuer.
        </p>
      </Section>
    </LegalPage>
  );
}
