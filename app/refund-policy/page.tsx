import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PublicFooter } from "@/components/public-footer";
import { publicSiteConfig } from "@/lib/public-site-config";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "AudienceOwn's policy for subscription cancellations, refund requests, duplicate charges, unauthorized payments, and enterprise agreements.",
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    title: "Refund Policy · AudienceOwn",
    description: "How AudienceOwn handles subscription cancellations, refund requests, billing errors, and enterprise agreements.",
    url: "/refund-policy",
    siteName: "AudienceOwn",
    type: "website",
  },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="border-t border-white/[.08] pt-9 print:break-inside-avoid print:border-zinc-300">
    <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-[-.025em] text-white sm:text-[1.7rem] print:text-black">{title}</h2>
    <div className="mt-4 space-y-4 text-[15px] leading-7 text-zinc-300 sm:text-base sm:leading-8 print:text-zinc-800">{children}</div>
  </section>;
}

const legalLink = "text-violet-300 transition-colors hover:text-violet-200 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 print:text-black";

export default function RefundPolicyPage() {
  const { supportEmail } = publicSiteConfig();

  return <main className="min-h-screen bg-[#07070b] text-white print:bg-white print:text-black">
    <header className="border-b border-white/[.07] print:hidden"><div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-5 lg:px-8"><Logo/><Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400">Back to AudienceOwn</Link></div></header>
    <div className="mx-auto max-w-[1180px] px-5 py-12 lg:px-8 lg:py-20">
      <article className="max-w-[760px]">
        <header>
          <h1 className="text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Refund Policy</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium text-violet-300 print:text-zinc-700"><p>Last updated: August 5, 2026</p><p>Effective date: August 5, 2026</p></div>
          <p className="mt-6 text-lg leading-8 text-zinc-300 print:text-zinc-800">This Refund Policy explains how AudienceOwn handles cancellations, refund requests, billing errors, and other payment concerns for purchases made directly from AudienceOwn.</p>
        </header>

        <div className="mt-12 space-y-10">
          <Section id="introduction" title="Introduction"><p>This policy applies to purchases made directly from AudienceOwn. Purchases made through a reseller, marketplace, app store, or other third party are governed by that provider’s billing and refund rules, and requests for those purchases should be directed to that provider.</p><p>This policy forms part of our <Link className={legalLink} href="/terms">Terms of Service</Link>. Our <Link className={legalLink} href="/privacy">Privacy Policy</Link> explains how we handle personal information submitted with a request. An enterprise agreement, order form, master services agreement, or negotiated commercial agreement may provide different terms and will control only where it expressly states different billing or refund terms.</p></Section>

          <Section id="free-plans" title="Free plans"><p>Free plans do not require a subscription payment and therefore do not create charges that can be refunded. Charges for separate paid offerings, if any, are considered under the terms presented at purchase and this policy.</p></Section>

          <Section id="free-trials" title="Free trials"><p>If AudienceOwn offers a free trial, the trial terms, length, included features, and any conversion to a paid subscription will be disclosed when the trial begins. If a trial is set to convert to a paid subscription, you can avoid the charge by cancelling before the deadline shown at enrollment. A charge made after a disclosed trial conversion is not automatically refundable, but we will review requests involving a billing error, misleading enrollment information, or rights provided by applicable law.</p></Section>

          <Section id="monthly-subscriptions" title="Monthly subscriptions"><p>If AudienceOwn offers monthly subscriptions, they will renew at the interval disclosed at purchase until cancelled. Cancelling stops future renewals and does not ordinarily refund the current billing period. We may consider a refund request when required by law, when a duplicate or incorrect charge occurred, or when other circumstances described in this policy apply.</p></Section>

          <Section id="annual-subscriptions" title="Annual subscriptions"><p>If AudienceOwn offers annual subscriptions, they will renew at the interval disclosed at purchase until cancelled. Cancelling stops future renewals and does not ordinarily refund an annual term that has already begun.</p><p>AudienceOwn encourages customers to report unintended renewals as soon as reasonably possible after discovering the charge. When reviewing the request, we may consider:</p><ul className="list-disc space-y-2 pl-6"><li>the timing of the request;</li><li>account activity;</li><li>the disclosures presented at purchase; and</li><li>applicable law.</li></ul><p>Eligibility depends on the facts, the purchase terms, and applicable law.</p></Section>

          <Section id="plan-changes" title="Upgrades and downgrades"><p>If subscription upgrades or downgrades become available, any immediate charge, credit, proration, or effective date will be shown before the change is confirmed or described in the applicable order form. A downgrade generally affects future service and does not automatically create a refund for the current paid period. We will review incorrect plan-change charges as billing errors.</p></Section>

          <Section id="cancellation" title="Cancellation and refunds"><p>Cancellation prevents future renewal; a refund returns an eligible payment that has already been collected. Cancelling a subscription does not by itself create a refund or credit. Cancellation instructions will be available in account settings or through the method presented at purchase.</p><p>Unless the purchase terms, an enterprise agreement, or applicable law provide otherwise, access generally continues through the current paid period after cancellation. Refund requests are reviewed separately under this policy.</p></Section>

          <Section id="duplicate-charges" title="Duplicate or incorrect charges"><p>If you believe you were charged more than once for the same purchase, charged an incorrect amount, or charged after a timely cancellation, contact us so we can review the transaction. If we confirm a billing error, we will correct it and issue any refund or credit that is appropriate.</p></Section>

          <Section id="unauthorized-payments" title="Unauthorized payments"><p>If you do not recognize a payment, contact us promptly and take reasonable steps to secure your AudienceOwn account and payment method. We may ask for information needed to identify the transaction and verify account ownership, but we will never ask you to send a full payment-card number, card security code, password, or authentication code by email.</p><p>You may also need to contact your bank or payment provider. A report of an unauthorized payment will be reviewed based on the available evidence and applicable law.</p></Section>

          <Section id="service-interruptions" title="Service interruptions"><p>AudienceOwn service failures are different from outages, API changes, access restrictions, or other failures caused by Connected Platforms. Because AudienceOwn does not control Connected Platforms, those events and the resulting unavailability of an integration do not automatically create refund eligibility for an AudienceOwn subscription.</p><p>Short AudienceOwn maintenance periods or temporary interruptions also do not automatically qualify for a refund. If a material failure of AudienceOwn itself substantially prevents use of paid services, contact us. We will review the situation under this policy and applicable law, considering the duration and impact, our responsibility for the interruption, and any remedy stated at purchase.</p></Section>

          <Section id="non-refundable-items" title="Items not automatically refundable"><p>Unless otherwise stated at purchase or required by law, we do not automatically provide refunds or credits for partial billing periods, unused time or features, failure to cancel before renewal, plan downgrades, changes in Connected Platforms, or dissatisfaction that does not result from a material failure of the paid AudienceOwn service.</p><p>This does not prevent you from submitting a request or limit any non-waivable right. A discretionary refund or credit in one situation does not require us to provide the same outcome in another.</p></Section>

          <Section id="fees" title="Payment processor and bank fees"><p>AudienceOwn does not receive or store full payment-card numbers. Payment information is generally processed by independent payment providers selected during checkout under their own terms and privacy policies.</p><p>Banks, card issuers, payment processors, and currency providers may impose fees or exchange-rate adjustments that AudienceOwn does not control. Those third-party charges are not generally refundable by AudienceOwn. If AudienceOwn directly charged a fee in error, we will review it as part of your request.</p></Section>

          <Section id="taxes" title="Taxes"><p>Refunds of taxes collected with an eligible payment will be handled as required by applicable tax rules. Taxes that AudienceOwn did not collect, or fees imposed independently by a bank or payment provider, may need to be addressed with the relevant authority or provider.</p></Section>

          <Section id="chargebacks" title="Chargebacks"><p>Please contact us first if you believe a charge is incorrect so we can investigate. Starting a chargeback does not create additional refund rights and may delay our ability to resolve the same transaction directly. We may provide relevant account, authorization, cancellation, and transaction records to the payment provider reviewing a dispute. We will not penalize a customer for exercising a lawful payment-dispute right.</p></Section>

          <Section id="refund-abuse" title="Refund abuse"><p>AudienceOwn may deny a discretionary refund where there is evidence of:</p><ul className="list-disc space-y-2 pl-6"><li>fraud;</li><li>abusive refund requests;</li><li>repeated misuse; or</li><li>an intentional attempt to obtain paid services without payment.</li></ul><p>This does not limit lawful consumer rights or prevent anyone from raising a legitimate billing dispute.</p></Section>

          <Section id="enterprise" title="Enterprise customers"><p>Enterprise purchases may be governed by an enterprise agreement, order form, master services agreement, or negotiated commercial agreement. Such an agreement overrides this Refund Policy only where it expressly states different billing or refund terms. Enterprise administrators should use the billing or legal contact identified in their agreement; otherwise, they may contact AudienceOwn support.</p></Section>

          <Section id="request" title="How to request a refund"><p>Send your request to <a className={legalLink} href={`mailto:${supportEmail}`}>{supportEmail}</a> or use our <Link className={legalLink} href="/contact">contact page</Link>. Include the email address associated with your AudienceOwn account, the approximate charge date and amount, and a brief explanation of the issue. Do not send full card details, security codes, passwords, authentication codes, or other sensitive credentials.</p></Section>

          <Section id="review" title="How requests are reviewed"><p>We review requests individually. We may consider the purchase terms, account and cancellation history, service usage, the nature and timing of the issue, evidence of a duplicate, unauthorized, or incorrect charge, any service interruption, signs of fraud or abuse, an applicable enterprise agreement, and rights provided by law. Refund investigations may require verification of account ownership to protect users from unauthorized refund requests. We may also request reasonable information needed to identify the transaction.</p><p>Submitting a request does not guarantee a refund. We will communicate the outcome through the contact information associated with the request.</p></Section>

          <Section id="refund-method" title="Refund method"><p>Approved refunds are generally returned to the original payment method unless another method is required by law or cannot reasonably be used. Processing time depends on the payment provider, bank, and payment method. AudienceOwn cannot control the time a financial institution takes to post an approved refund.</p></Section>

          <Section id="consumer-rights" title="Consumer rights"><p>Nothing in this Refund Policy limits any refund, cancellation, withdrawal, or consumer protection rights that cannot be waived under applicable law.</p><p>Nothing in this Refund Policy limits withdrawal, cancellation, refund, or other consumer protection rights that cannot legally be excluded under applicable law. Where applicable law grants consumers a statutory withdrawal period or cooling-off period for online purchases, AudienceOwn will honor those rights.</p></Section>

          <Section id="changes" title="Changes to this policy"><p>We may update this policy to reflect changes to our services, purchase methods, or legal requirements. We will post the revised policy and update the date above. Changes apply prospectively and do not reduce rights that already apply to a completed purchase.</p></Section>

          <Section id="contact" title="Contact us"><p>Questions about this policy or a payment can be sent to <a className={legalLink} href={`mailto:${supportEmail}`}>{supportEmail}</a>. For other service questions, visit our <Link className={legalLink} href="/contact">contact page</Link>.</p></Section>
        </div>
      </article>
    </div>
    <div className="print:hidden"><PublicFooter/></div>
  </main>;
}
