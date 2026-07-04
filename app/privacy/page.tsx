import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import LegalPage, { Callout, H2, P, Ul, Li, A } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · BurntCV",
  description:
    "How BurntCV handles your data. Short answer: we don't store your résumé — it's processed to make your roast and then it's gone.",
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
      tagline="Roasted and forgotten. Here's exactly what that means."
      updated={LEGAL.effectiveDate}
      embed={embed}
    >
      <Callout tone="purple">
        <strong>The short version:</strong> we don&apos;t store your résumé. Your file
        is read inside your own browser, its text is sent to our AI provider only
        to generate your roast, and your roast history is kept on your device —
        not on our servers. The little we do handle (an IP address for
        abuse-prevention, and payment details if you buy something) is described
        below.
      </Callout>

      <P>
        This policy explains how {LEGAL.entityName} ({LEGAL.entityType}) (“we”,
        “us”), the operator of BurntCV at {LEGAL.siteUrl}, collects and uses
        personal data. We act as the data fiduciary for the limited data we
        handle. It should be read with our <A href="/terms">Terms of Service</A>.
      </P>

      <H2>1. What we do NOT store</H2>
      <P>
        We do not store your résumé or LinkedIn profile file or its text on our
        servers. When you upload a PDF, it is parsed <strong>in your browser</strong> —
        the file itself is not uploaded to us. Only the extracted text needed to
        produce the roast leaves your device, and only to the AI provider
        described next.
      </P>

      <H2>2. How a roast is generated (the data flow)</H2>
      <Ul>
        <Li>Your PDF is read locally in your browser; we extract the text there.</Li>
        <Li>
          That text is sent to our AI provider,{" "}
          <A href="https://www.anthropic.com/legal/privacy" external>Anthropic</A>{" "}
          (the Claude API), purely to generate your roast. If you use your own
          API key (BYOK), this call is made directly from your browser to
          Anthropic under your own account.
        </Li>
        <Li>
          Under Anthropic&apos;s API terms, inputs and outputs are not used to train
          its models. We do not retain the résumé text after your roast is
          returned.
        </Li>
      </Ul>

      <H2>3. What is stored on your device</H2>
      <P>
        For the app to work, we save some data locally in your browser&apos;s storage
        (never transmitted to us):
      </P>
      <Ul>
        <Li>Your roast history (the roast text — not the résumé) and simple usage counters.</Li>
        <Li>Your Pass status, Pass token, and restore code, if you&apos;ve purchased.</Li>
        <Li>Your AI provider API key, if you chose BYOK — this stays on your device only.</Li>
      </Ul>
      <P>
        You can delete all of this at any time by clearing your browser&apos;s site
        data for BurntCV.
      </P>

      <H2>4. What we collect on our servers</H2>
      <Ul>
        <Li>
          <strong>IP address</strong> — used transiently to rate-limit roasts and
          prevent abuse (via <A href="https://upstash.com/trust/privacy.pdf" external>Upstash</A>).
        </Li>
        <Li>
          <strong>Purchase details</strong> — if you buy a roast or a Pass, your
          payment is handled by <A href="https://razorpay.com/privacy/" external>Razorpay</A>,
          which shares limited transaction metadata (such as order ID, status,
          and the email you provide) with us so we can grant and restore your
          entitlement. We never receive or store your full card/UPI credentials.
        </Li>
        <Li>
          <strong>Anonymous usage analytics</strong> — aggregate, privacy-friendly
          metrics via <A href="https://vercel.com/legal/privacy-policy" external>Vercel Analytics</A>.
          No advertising cookies, no cross-site tracking.
        </Li>
      </Ul>

      <H2>5. Third parties we rely on</H2>
      <Ul>
        <Li><strong>Anthropic (Claude API)</strong> — generates the roast from your text.</Li>
        <Li><strong>Razorpay</strong> — processes payments.</Li>
        <Li><strong>Vercel</strong> — hosts the site and provides anonymous analytics.</Li>
        <Li><strong>Upstash</strong> — rate-limiting / abuse-prevention.</Li>
        <Li><strong>Fontshare</strong> — serves the site&apos;s font; loading it shares your IP with the font CDN, as is standard for web fonts.</Li>
      </Ul>

      <H2>6. Cookies &amp; local storage</H2>
      <P>
        We don&apos;t use advertising or cross-site tracking cookies. We use your
        browser&apos;s local storage to run the app (as in section 3) and essential /
        analytics technology to keep the Service working and measure aggregate
        usage.
      </P>

      <H2>7. Where your data is processed</H2>
      <P>
        Some of our providers (including Anthropic, Vercel, and Upstash) process
        data on servers that may be located outside India. By using BurntCV you
        consent to this cross-border processing. Payment data is handled by
        Razorpay in line with applicable Indian regulations.
      </P>

      <H2>8. How long we keep things</H2>
      <Ul>
        <Li><strong>Résumé / profile text:</strong> not retained after your roast is generated.</Li>
        <Li><strong>IP / rate-limit data:</strong> short-lived, only as long as needed to prevent abuse.</Li>
        <Li><strong>Purchase records:</strong> kept as long as needed to honour your entitlement and to meet tax/legal obligations.</Li>
        <Li><strong>On-device data:</strong> stays until you clear your browser storage.</Li>
      </Ul>

      <H2>9. Your rights</H2>
      <P>
        Under India&apos;s Digital Personal Data Protection Act, 2023 and the rules
        made under it, you can request access to, correction of, or erasure of
        the personal data we hold about you, and you can raise a grievance. Most
        of your data lives on your own device, so you can delete it directly by
        clearing your browser storage. For anything we hold server-side, contact
        us using the details below.
      </P>

      <H2>10. Grievance Officer</H2>
      <P>
        For privacy questions, requests, or complaints, contact our Grievance
        Officer:
      </P>
      <Ul>
        <Li><A href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</A></Li>
      </Ul>
      <P>
        We aim to acknowledge grievances within 48 hours and resolve them within
        30 days. If you&apos;re not satisfied with our response, you may approach the{" "}
        <strong>Data Protection Board of India</strong>.
      </P>

      <H2>11. Children</H2>
      <P>
        BurntCV is intended for users aged 18 and over and is not directed at
        children. We don&apos;t knowingly collect data from anyone under 18.
      </P>

      <H2>12. Security</H2>
      <P>
        We serve the Service over HTTPS with a strict content-security policy and
        deliberately collect as little personal data as possible. No method of
        transmission or storage is perfectly secure, but keeping your résumé off
        our servers is a core part of how we protect it.
      </P>

      <H2>13. Changes &amp; contact</H2>
      <P>
        We may update this policy; the “last updated” date above reflects the
        latest version. Questions? Email{" "}
        <A href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</A> or visit
        our <A href="/contact">Contact</A> page.
      </P>
    </LegalPage>
  );
}
