import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import LegalPage, { Callout, H2, P, Ul, Li, A } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy · BurntCV",
  description:
    "How refunds and cancellations work at BurntCV. Digital product, delivered instantly, one-time purchases — with refunds for genuine failures.",
};

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund & Cancellation"
      tagline="Digital product, delivered in seconds. Here's exactly when you get your money back."
      updated={LEGAL.effectiveDate}
    >
      <Callout>
        <strong>The short version:</strong> there&apos;s a free roast so you can try
        before you pay. Purchases are one-time and never auto-renew, so there&apos;s
        no subscription to cancel. If you were charged but didn&apos;t get your roast
        (or were charged twice), you get a full refund.
      </Callout>

      <H2>1. What you&apos;re buying</H2>
      <P>
        BurntCV is a digital service, delivered instantly. Paid options are:
      </P>
      <Ul>
        <Li><strong>₹7 — One roast:</strong> a single additional roast.</Li>
        <Li><strong>₹5 — Extra roast:</strong> a top-up after your daily Pass roasts are used.</Li>
        <Li><strong>₹199 — 6-Month Pass:</strong> up to 5 roasts per day for six months.</Li>
      </Ul>
      <P>
        All of these are <strong>one-time charges</strong>. Using your own AI key
        (BYOK) involves no charge from us at all.
      </P>

      <H2>2. Cancellation</H2>
      <P>
        Nothing you buy renews automatically, so there is no recurring
        subscription to cancel and you will never be charged again unless you
        choose to buy again. The 6-Month Pass is time-limited access that simply
        expires at the end of six months. You can stop using BurntCV whenever you
        like — your Pass, if any, remains valid until it expires.
      </P>

      <H2>3. When you&apos;re eligible for a refund</H2>
      <P>We&apos;ll issue a full refund if:</P>
      <Ul>
        <Li>You were charged but your roast or Pass was not delivered.</Li>
        <Li>You were charged more than once for the same purchase (duplicate / double charge).</Li>
        <Li>A technical failure on our side prevented you from getting what you paid for.</Li>
      </Ul>

      <H2>4. When a refund isn&apos;t usually available</H2>
      <P>
        Because this is a digital product that&apos;s delivered and consumed
        immediately, refunds are not ordinarily available when:
      </P>
      <Ul>
        <Li>You&apos;ve already received the roast(s) or used the Pass and simply changed your mind.</Li>
        <Li>You didn&apos;t like your roast — it&apos;s a roast; being unflattering is the product working as intended.</Li>
        <Li>Your 6-Month Pass period has elapsed.</Li>
      </Ul>
      <P>
        That said, if something genuinely went wrong, tell us — we review every
        request in good faith and will do the right thing.
      </P>

      <H2>5. How to request a refund</H2>
      <P>
        Email <A href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</A>{" "}
        within 7 days of the charge, and include:
      </P>
      <Ul>
        <Li>Your Razorpay Payment ID / Order ID (from your payment confirmation).</Li>
        <Li>The email address used for the purchase.</Li>
        <Li>A short note on what went wrong.</Li>
      </Ul>

      <H2>6. How refunds are processed</H2>
      <P>
        Once approved, refunds are made to your original payment method via
        Razorpay. The amount typically reaches you within{" "}
        <strong>5–7 business days</strong>, though your bank&apos;s or card issuer&apos;s
        own timelines can vary.
      </P>

      <H2>7. Contact</H2>
      <P>
        Anything about a payment or refund? Email{" "}
        <A href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</A> or see
        our <A href="/contact">Contact</A> page. This policy works alongside our{" "}
        <A href="/terms">Terms of Service</A>.
      </P>
    </LegalPage>
  );
}
