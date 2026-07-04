import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import LegalPage, { Callout, H2, P, Ul, Li, A } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Contact · BurntCV",
  description:
    "Get in touch with BurntCV — support, privacy grievances, and business details.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const embed = (await searchParams).embed === "1";
  return (
    <LegalPage
      title="Contact"
      tagline="Real humans (well, one) behind the roasts. Here's how to reach us."
      updated={LEGAL.effectiveDate}
      embed={embed}
    >
      <Callout>
        Fastest way to reach us is email. We reply to most messages within 2
        business days.
      </Callout>

      <H2>Support</H2>
      <P>
        Questions, bugs, payment issues, or feedback on your roast:
      </P>
      <Ul>
        <Li><A href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</A></Li>
      </Ul>

      <H2>Privacy &amp; grievances</H2>
      <P>
        For data-protection requests or complaints under our{" "}
        <A href="/privacy">Privacy Policy</A>, contact our Grievance Officer:
      </P>
      <Ul>
        <Li><A href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</A></Li>
      </Ul>

      <H2>Business details</H2>
      <Ul>
        <Li><strong>Operated by:</strong> {LEGAL.entityName} ({LEGAL.entityType})</Li>
        <Li><strong>Registered address:</strong> {LEGAL.address}</Li>
        {LEGAL.gstin ? <Li><strong>GSTIN:</strong> {LEGAL.gstin}</Li> : null}
      </Ul>

      <H2>Hours</H2>
      <P>Monday–Friday, 10:00–18:00 IST (excluding public holidays).</P>

      <P>
        See also our <A href="/terms">Terms of Service</A> and{" "}
        <A href="/refund">Refund &amp; Cancellation Policy</A>.
      </P>
    </LegalPage>
  );
}
