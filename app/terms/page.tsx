import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import LegalPage, { Callout, H2, P, Ul, Li, A } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · BurntCV",
  description:
    "The terms for using BurntCV — an AI résumé-roasting entertainment product. Please read before you get destroyed.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      tagline="The boring bit before the roast. Read it once so we both know where we stand."
      updated={LEGAL.effectiveDate}
    >
      <Callout>
        <strong>The short version:</strong> BurntCV is a comedy product that
        roasts résumés and LinkedIn profiles for laughs. It is not career, legal,
        or financial advice. You must be 18+, only submit content you have the
        right to submit, and understand that the roast is meant to be
        unflattering — that is the entire point.
      </Callout>

      <H2>1. Who you&apos;re agreeing with</H2>
      <P>
        BurntCV (the “Service”, at {LEGAL.siteUrl}) is operated by{" "}
        {LEGAL.entityName} ({LEGAL.entityType}) (“we”, “us”, “our”). By accessing
        or using the Service you agree to these Terms and to our{" "}
        <A href="/privacy">Privacy Policy</A> and{" "}
        <A href="/refund">Refund &amp; Cancellation Policy</A>. If you do not
        agree, please don&apos;t use the Service.
      </P>

      <H2>2. What BurntCV actually is</H2>
      <P>
        The Service uses AI to generate a humorous “roast” of a résumé or
        LinkedIn profile you provide. It is entertainment and satire. It is{" "}
        <strong>not</strong> a professional assessment of your résumé, your
        career, or you as a person, and it is not advice of any kind.
      </P>
      <Ul>
        <Li>The output is AI-generated and may be inaccurate, unfair, or plain wrong.</Li>
        <Li>The roast is intentionally critical and comedic. Don&apos;t submit content you&apos;d be upset to see roasted.</Li>
        <Li>Do not make hiring, career, or any other real-world decisions based on a roast.</Li>
      </Ul>

      <H2>3. Eligibility</H2>
      <P>
        You must be at least 18 years old to use BurntCV. By using it, you
        confirm that you are.
      </P>

      <H2>4. The content you submit</H2>
      <P>
        “Your Content” means the résumé, profile text, LinkedIn URL, or other
        material you provide to be roasted. You confirm that:
      </P>
      <Ul>
        <Li>You own it or have permission to submit it, and submitting it doesn&apos;t break the law or anyone&apos;s rights.</Li>
        <Li>You will not upload another identifiable person&apos;s résumé or personal data without their consent, or use the Service to harass, demean, or target a real person.</Li>
        <Li>You will not submit anything unlawful, hateful, or infringing.</Li>
      </Ul>
      <P>
        You keep all ownership of Your Content. You grant us only the limited,
        temporary permission needed to process it and generate your roast, as
        described in the <A href="/privacy">Privacy Policy</A>. We do not store
        your résumé.
      </P>

      <H2>5. Acceptable use</H2>
      <Ul>
        <Li>Don&apos;t scrape, resell, or bulk-automate the Service, or bypass its rate limits.</Li>
        <Li>Don&apos;t reverse-engineer, disrupt, or attempt to break the Service or its security.</Li>
        <Li>Don&apos;t misrepresent a roast as a genuine, professional, or official assessment.</Li>
        <Li>
          <strong>Bring-your-own-key (BYOK):</strong> if you use your own AI
          provider API key, you are responsible for that key, its costs, and
          complying with that provider&apos;s terms. Charges on your key are between
          you and that provider.
        </Li>
      </Ul>

      <H2>6. Pricing &amp; payments</H2>
      <P>
        You get one free roast. After that, the following one-time options are
        available (prices in INR, inclusive of applicable taxes as shown at
        checkout):
      </P>
      <Ul>
        <Li><strong>₹7 — One roast</strong> (a single additional roast).</Li>
        <Li><strong>₹5 — Extra roast</strong> (a top-up once you&apos;ve used your daily Pass roasts).</Li>
        <Li><strong>₹199 — 6-Month Pass</strong> (up to 5 roasts per day for six months).</Li>
      </Ul>
      <P>
        All purchases are <strong>one-time charges</strong>. Nothing
        auto-renews. The 6-Month Pass is time-limited access that simply expires
        at the end of the period — you are not charged again unless you choose to
        buy again. Payments are processed by our payment partner,{" "}
        <A href="https://razorpay.com" external>Razorpay</A>; we don&apos;t receive or
        store your full card details. Refunds and cancellation are covered in the{" "}
        <A href="/refund">Refund &amp; Cancellation Policy</A>. We may change
        prices or plans at any time; changes apply to future purchases only.
      </P>

      <H2>7. The roast output &amp; our IP</H2>
      <P>
        We&apos;re happy for you to share your own roast (including our share cards)
        on social media and with friends. The Service itself — its software,
        design, brand, name, and logo — belongs to us, and nothing here transfers
        those rights to you. Don&apos;t reproduce the Service or present its output as
        an official evaluation.
      </P>

      <H2>8. Disclaimers</H2>
      <P>
        The Service is provided “as is” and “as available”, without warranties of
        any kind, express or implied, including fitness for a particular purpose,
        accuracy, or uninterrupted availability. Because BurntCV is a roast, its
        output is designed to be blunt and comedic; by using it you accept that
        tone. We are not responsible for any decision you make based on it.
      </P>

      <H2>9. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, we are not liable for any
        indirect, incidental, special, or consequential damages, or for lost
        profits, data, or goodwill. Our total liability for any claim relating to
        the Service is limited to the amount you actually paid us for it in the
        three months before the claim (which, for most users, is a small amount
        or zero).
      </P>

      <H2>10. Indemnity</H2>
      <P>
        You agree to indemnify and hold us harmless from claims arising out of
        Your Content or your misuse of the Service or breach of these Terms.
      </P>

      <H2>11. Suspension &amp; termination</H2>
      <P>
        We may suspend or terminate access if you break these Terms, abuse the
        Service, or create risk or legal exposure for us. You may stop using the
        Service at any time.
      </P>

      <H2>12. Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time. Material changes take effect
        when we post the updated version with a new “last updated” date.
        Continuing to use the Service after that means you accept the changes.
      </P>

      <H2>13. Governing law</H2>
      <P>
        These Terms are governed by the laws of India, and the courts at{" "}
        {LEGAL.jurisdiction} have exclusive jurisdiction over any dispute.
      </P>

      <H2>14. Contact</H2>
      <P>
        Questions about these Terms? Email{" "}
        <A href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</A> or see
        our <A href="/contact">Contact</A> page.
      </P>
    </LegalPage>
  );
}
