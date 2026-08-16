import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PublicFooter } from "@/components/public-footer";
import { publicSiteConfig } from "@/lib/public-site-config";

export const metadata: Metadata = {
  title: { absolute: "Data Deletion | AudienceOwn" },
  description: "Learn how to request deletion of your AudienceOwn account and personal data, including data associated with connected third-party platforms.",
  alternates: { canonical: "/data-deletion" },
  openGraph: {
    title: "Data Deletion | AudienceOwn",
    description: "Learn how to request deletion of your AudienceOwn account and personal data, including data associated with connected third-party platforms.",
    url: "/data-deletion",
    siteName: "AudienceOwn",
    type: "website",
  },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-8 border-t border-white/[.08] pt-9 print:break-inside-avoid print:border-zinc-300">
    <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-[-.025em] text-white sm:text-[1.7rem] print:text-black">{title}</h2>
    <div className="mt-4 space-y-4 text-[15px] leading-7 text-zinc-300 sm:text-base sm:leading-8 print:text-zinc-800">{children}</div>
  </section>;
}

const linkClass = "text-violet-300 transition-colors hover:text-violet-200 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 print:text-black";

export default function DataDeletionPage() {
  const { privacyEmail } = publicSiteConfig();

  return <main className="min-h-screen bg-[#07070b] text-white print:bg-white print:text-black">
    <header className="border-b border-white/[.07] print:hidden"><div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-5 lg:px-8"><Logo/><Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400">Back to AudienceOwn</Link></div></header>
    <div className="mx-auto max-w-[1180px] px-5 py-12 lg:px-8 lg:py-20">
      <article className="max-w-[760px]">
        <header>
          <p className="eyebrow">Your information</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Data Deletion</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium text-violet-300 print:text-zinc-700"><p>Last updated: August 13, 2026</p><p>Effective date: August 13, 2026</p></div>
          <p className="mt-6 text-lg leading-8 text-zinc-300 print:text-zinc-800">AudienceOwn respects your right to control your personal data. This page explains how to request deletion of your AudienceOwn account and associated personal data.</p>
          <p className="mt-4 leading-7 text-zinc-400 print:text-zinc-700">Different controls apply to an AudienceOwn account, an authorized YouTube connection, and a fan’s Recovery Pass. Deleting information from AudienceOwn does not delete an account or content held by an independent platform.</p>
        </header>

        <div className="mt-12 space-y-10">
          <Section id="account-deletion" title="Delete your AudienceOwn account">
            <p>A signed-in Creator can request account deletion from Account Settings. The control requires a recent sign-in and the confirmation phrase shown on the page. AudienceOwn first disables and cleans up connected YouTube authorization, then attempts to delete the Creator record and its dependent application data, deletes the authentication account last, and signs out active AudienceOwn sessions.</p>
            <p>Deletion is reported as complete only when the request succeeds. If provider cleanup or application-data deletion cannot finish, AudienceOwn returns an error instead of recording a false success. You can retry or contact support for help. You may also ask support to remove uploaded media or other information that remains after the self-service request.</p>
            <p>Account deletion is intended to be permanent. After deletion has completed, the account and associated access generally cannot be restored.</p>
            <div className="flex flex-wrap gap-3 print:hidden"><Link className="button button-primary" href="/dashboard/settings/account">Open account deletion controls</Link></div>
          </Section>

          <Section id="connected-platforms" title="Disconnect a Connected Platform">
            <p>Disconnect controls are available for supported Connected Platforms. The current dedicated deletion workflow applies to YouTube: it disables synchronization and further authorized access immediately, asks Google to revoke the authorization, and begins provider cleanup. Additional Connected Platforms will follow the deletion behavior implemented for their respective integrations.</p>
            <p>Google Sign-In is separate from YouTube authorization. AudienceOwn does not currently provide a standalone control to detach Google Sign-In while keeping the same AudienceOwn authentication account. Signing out ends the AudienceOwn session, account deletion removes the AudienceOwn authentication account, and you can separately review Google permissions in your Google account.</p>
            <div className="print:hidden"><Link className="button button-secondary" href="/dashboard/settings/connected-accounts">Manage Connected Platforms</Link></div>
          </Section>

          <Section id="facebook-meta" title="Facebook and Meta data">
            <p>If you connected a Facebook account, Facebook Page, Instagram account, or another Meta asset to AudienceOwn, you can request deletion of the data AudienceOwn received or stored in connection with that account by emailing <a className={linkClass} href={`mailto:${privacyEmail}`}>{privacyEmail}</a> from the email address associated with your AudienceOwn account. Identify the connected account or Page in your request, but do not send passwords, access tokens, verification codes, or other credentials.</p>
            <p>After verifying the request where necessary, AudienceOwn will delete or disassociate applicable Meta-related data under its control, subject to limited legal, security, fraud-prevention, accounting, or compliance retention requirements. This does not delete your Facebook or Instagram account, Page, posts, messages, or other information maintained independently by Meta. You may also need to manage that information through the applicable Meta service.</p>
          </Section>

          <Section id="google-youtube" title="Google and YouTube data">
            <p>AudienceOwn stores only the information reasonably necessary to operate the authorized connection. Connecting YouTube authorizes read-only access separately from Google Sign-In. AudienceOwn stores encrypted OAuth access and refresh tokens on the server, along with the granted scope, authorized channel identifiers and metadata, subscriber metrics and snapshots, public-upload information, synchronization checkpoints, and connection-health information.</p>
            <p>When YouTube disconnection completes, AudienceOwn removes the encrypted credentials, granted scopes, authorization state, stored channel metadata, subscriber metrics and snapshots, imported public-upload data, polling state, provider events, and related cached projections. It also removes YouTube source details from AudienceOwn updates that were created from the connection. You may instead keep the public channel URL as a manually added recovery destination with no OAuth data attached.</p>
            <p>If Google cannot complete revocation at that time, AudienceOwn keeps provider access and synchronization disabled and reports that revocation is pending. Cleanup can be retried. AudienceOwn does not claim that Google-hosted data has been deleted: disconnecting does not delete a Google account, YouTube channel, video, comment, or other content stored by Google.</p>
            <p>For more about the separate authorization flows and the single <code className="rounded bg-white/[.06] px-1.5 py-0.5 text-sm text-zinc-200 print:text-black">youtube.readonly</code> permission, review the <Link className={linkClass} href="/google-api-disclosure">Google API Disclosure</Link>.</p>
          </Section>

          <Section id="recovery-pass" title="Recovery Pass data">
            <p>A fan can update Recovery Pass preferences, unsubscribe using a private link, or deactivate a saved pass from the supported public Creator experience. Deactivation removes the saved Recovery Pass entry from that browser. For supported SMS, WhatsApp, and browser-notification methods, the management flow also disables or revokes the selected recovery method when the required private token is available.</p>
            <p>Browser-local data and server-side records are managed independently. Clearing browser storage removes the copy held on that device but does not delete server records. Unsubscribing or deactivating a method does not necessarily erase every server record: AudienceOwn may retain an opt-out, suppression, consent, or security record needed to respect the choice and prevent unwanted messages. Contact support to request deletion of other stored Recovery Pass information.</p>
            <p>The <Link className={linkClass} href="/cookie-policy">Cookie Policy</Link> explains browser storage in more detail.</p>
          </Section>

          <Section id="creator-page" title="Creator page data">
            <p>When account deletion completes, the public AudienceOwn creator page and its connected public presentation are no longer available through the active account. Links, screenshots, search-engine copies, or cached material held outside AudienceOwn may remain until the service holding that copy updates or removes it.</p>
            <p>The current self-service deletion route does not separately confirm deletion of every uploaded media object. A Creator can contact support to request removal of remaining uploaded profile or banner media.</p>
          </Section>

          <Section id="timing" title="When deletion happens">
            <p>AudienceOwn applies an available deletion or deactivation control when the request is successfully processed. YouTube synchronization stops as soon as disconnection begins. Encrypted YouTube credentials and authorized provider data are removed after Google revocation succeeds or the authorization is already invalid.</p>
            <p>Some cleanup cannot complete immediately. This can happen when provider revocation is pending, a dependent operation fails safely, information must remain to honor an opt-out, or limited records must be retained for security, fraud prevention, billing, legal obligations, backup restoration, or system integrity. AudienceOwn does not assign a single retention period to every type of information.</p>
          </Section>

          <Section id="legal-retention" title="Limited retention">
            <p>AudienceOwn may retain limited information when reasonably necessary to comply with applicable law, a valid court order, tax or accounting obligations, a fraud investigation, or a security investigation. We may also preserve records needed to establish, exercise, or defend legal rights.</p>
            <p>Retention depends on the record and the reason it is needed. Retained information remains subject to appropriate access controls and is not kept merely because a deletion request was made.</p>
            <p>AudienceOwn does not retain information longer than reasonably necessary for the purpose for which it is retained, subject to applicable legal obligations.</p>
          </Section>

          <Section id="backups" title="Backups">
            <p>Deleted information may temporarily remain in secure backups until those backups are rotated. Backup copies are maintained for continuity and disaster recovery and are not returned to the live service except when restoration is needed for disaster recovery.</p>
            <p>If a backup is restored, applicable deletion and suppression requirements remain in effect as systems are recovered.</p>
          </Section>

          <Section id="request" title="Request deletion of your data">
            <p>To request deletion of your AudienceOwn account and associated personal data, contact <a className={linkClass} href={`mailto:${privacyEmail}`}>{privacyEmail}</a> from the email address associated with your AudienceOwn account. You can use this process if you cannot sign in, cannot use an available deletion control, or want to request deletion of particular information. Describe the AudienceOwn account, Creator page, Connected Platform, or Recovery Pass information involved.</p>
            <p>AudienceOwn may ask for reasonable information to verify account ownership or authority before processing the request. Never send passwords, OAuth tokens, one-time verification codes, or other authentication credentials. AudienceOwn support will never ask you for them.</p>
          </Section>

          <Section id="after-request" title="What happens after a request">
            <p>AudienceOwn reviews the request and may verify your identity or authority over the account. When a valid request is completed, applicable personal data controlled by AudienceOwn will be deleted, anonymized, or disassociated, subject to the limited retention described below.</p>
            <p>Deleting information from AudienceOwn does not delete your account, Page, channel, posts, or other content on a third-party service. Those services maintain their own data and deletion controls.</p>
          </Section>

          <Section id="children" title="Children’s information">
            <p>AudienceOwn is not directed to children under 13 and does not knowingly collect their personal information. If you believe a child provided information inappropriately, contact <a className={linkClass} href={`mailto:${privacyEmail}`}>{privacyEmail}</a> so we can investigate and take appropriate action. Higher minimum ages may apply in some countries.</p>
          </Section>

          <Section id="changes" title="Changes to this policy">
            <p>We may update this Data Deletion Policy when AudienceOwn features, Connected Platform requirements, deletion controls, or legal obligations change. We will publish the revised policy here and update the date above.</p>
          </Section>

          <Section id="contact" title="Contact">
            <p>For deletion help or questions about this policy, contact <a className={linkClass} href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. Additional information about AudienceOwn&apos;s privacy practices is available in the <Link className={linkClass} href="/privacy">Privacy Policy</Link>. Browser technologies are explained in the <Link className={linkClass} href="/cookie-policy">Cookie Policy</Link>. The rules governing use of the service are described in the <Link className={linkClass} href="/terms">Terms of Service</Link>.</p>
          </Section>
        </div>
      </article>
    </div>
    <div className="print:hidden"><PublicFooter/></div>
  </main>;
}
