import type { Metadata } from "next";
import LegalPage, { Section } from "@/components/LegalPage";
import { OPERATOR, OPERATOR_LOCATION } from "@/lib/operator";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy — BurntCV",
  description: `${OPERATOR.brand} is a digital service — roasts are delivered instantly online. Operated by ${OPERATOR.legalName}.`,
  robots: { index: true, follow: true },
};

export default function ShippingPage() {
  return (
    <LegalPage
      title="Shipping & Delivery Policy"
      intro={
        <>
          {OPERATOR.brand}, operated by {OPERATOR.legalName}, {OPERATOR_LOCATION},
          is a fully digital service. There is no physical shipping.
        </>
      }
    >
      <Section title="Digital delivery only">
        <p>
          Everything {OPERATOR.brand} sells — a single roast, a top-up roast, or a
          pass — is delivered electronically. No physical goods are shipped and no
          shipping charges apply.
        </p>
      </Section>

      <Section title="When you receive it">
        <p>
          Delivery is instant. As soon as your payment is confirmed, your roast is
          generated and shown to you in the browser, and any pass or roast credit
          is activated on your device immediately.
        </p>
      </Section>

      <Section title="If something doesn&rsquo;t arrive">
        <p>
          If your payment succeeds but your roast or pass is not delivered because
          of a technical issue, we will make it right — either by delivering the
          service or by issuing a refund under our Cancellation & Refund Policy.
          Email{" "}
          <a
            href={`mailto:${OPERATOR.email}`}
            style={{ color: "#4e3188", fontWeight: 600 }}
          >
            {OPERATOR.email}
          </a>{" "}
          with your order reference and we&apos;ll sort it out.
        </p>
      </Section>
    </LegalPage>
  );
}
