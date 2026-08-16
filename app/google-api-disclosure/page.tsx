import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PublicFooter } from "@/components/public-footer";
import { publicSiteConfig } from "@/lib/public-site-config";

export const metadata: Metadata = {
  title: "Google API Disclosure",
  description: "How AudienceOwn accesses, uses, protects, and deletes information received through Google Sign-In and the YouTube API.",
  alternates: { canonical: "/google-api-disclosure" },
  openGraph: {
    title: "Google API Disclosure · AudienceOwn",
    description: "How AudienceOwn handles Google Sign-In and read-only YouTube API data.",
    url: "/google-api-disclosure",
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

export default function GoogleApiDisclosurePage() {
  const { supportEmail } = publicSiteConfig();

  return <main className="min-h-screen bg-[#07070b] text-white print:bg-white print:text-black">
    <header className="border-b border-white/[.07] print:hidden"><div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-5 lg:px-8"><Logo/><Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400">Back to AudienceOwn</Link></div></header>
    <div className="mx-auto max-w-[1180px] px-5 py-12 lg:px-8 lg:py-20">
      <article className="max-w-[760px]">
        <header>
          <p className="eyebrow">Google account transparency</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Google API Disclosure</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium text-violet-300 print:text-zinc-700"><p>Last updated: August 6, 2026</p><p>Effective date: August 6, 2026</p></div>
          <p className="mt-6 text-lg leading-8 text-zinc-300 print:text-zinc-800">AudienceOwn lets users sign in with a Google account and, when a Creator chooses, connect a YouTube channel through Google’s OAuth system. This page explains how AudienceOwn accesses, uses, protects, and deletes Google user data.</p>
          <p className="mt-4 leading-7 text-zinc-400 print:text-zinc-700">Google Sign-In and YouTube authorization are separate. Signing in with Google does not connect a YouTube channel or grant AudienceOwn access to YouTube data.</p>
        </header>

        <div className="mt-12 space-y-10">
          <Section id="google-sign-in" title="Google Sign-In">
            <p>When you select “Continue with Google,” AudienceOwn uses basic identity information supplied through Google Sign-In: your email address, stable Google account identifier, display name, and profile image when available.</p>
            <p>AudienceOwn uses this information to authenticate you, create or maintain your AudienceOwn account, and protect access to that account. Google Sign-In does not give AudienceOwn access to your Google password, contacts, messages, files, search history, watch history, or YouTube channel.</p>
          </Section>

          <Section id="youtube-authorization" title="Optional YouTube authorization">
            <p>Connecting a YouTube channel is optional and starts only when a signed-in Creator selects “Connect YouTube.” AudienceOwn requests one scope: <code className="rounded bg-white/[.06] px-1.5 py-0.5 text-sm text-zinc-200 print:text-black">youtube.readonly</code>.</p>
            <p>This read-only permission allows AudienceOwn to identify the connected channel, retrieve its public channel information, synchronize subscriber metrics, retrieve public upload, video, and livestream information, and report connection health.</p>
            <p>AudienceOwn does not request permission to upload, edit, or delete videos; manage comments; modify playlists; change channel settings; or otherwise manage a YouTube channel. The current integration does not request access to private videos.</p>
          </Section>

          <Section id="data-used" title="How Google user data is used">
            <p>AudienceOwn uses Google user data only to provide the feature the user requested. This includes account authentication, channel verification, subscriber synchronization, public-upload monitoring, connection health, and connected-channel information used by AudienceOwn’s audience protection features.</p>
            <p>AudienceOwn does not use Google user data for advertising and does not sell Google user data.</p>
          </Section>

          <Section id="tokens" title="Token storage and refresh">
            <p>YouTube OAuth access tokens and refresh tokens are encrypted and stored on the server. Browser clients do not receive raw provider tokens. Access to tokens is limited to authenticated, authorized server processes that operate the connected feature.</p>
            <p>When Google provides a refresh token, AudienceOwn may use it to refresh an expiring YouTube access token automatically so an authorized synchronization can continue. A refreshed token does not expand the permission granted by the Creator.</p>
            <p>AudienceOwn will never request additional Google permissions unless the Creator explicitly authorizes a new connection or expanded access.</p>
          </Section>

          <Section id="disconnect" title="Disconnecting YouTube">
            <p>A Creator can disconnect YouTube from <Link className={linkClass} href="/dashboard/settings/connected-accounts">Connected Accounts</Link>. AudienceOwn immediately disables further provider access and synchronization, asks Google to revoke the authorization, and removes encrypted credentials and stored authorized YouTube data after revocation succeeds or Google reports that the authorization is already invalid.</p>
            <p>If Google is temporarily unable to complete revocation, AudienceOwn keeps provider access disabled and reports that revocation is pending so cleanup can be retried. A Creator may either remove the YouTube account from AudienceOwn or retain its public URL as a manually added recovery destination with no OAuth data attached. Access may also be revoked independently through Google’s account permissions controls.</p>
          </Section>

          <Section id="deletion" title="Deleting Google-related data">
            <p>Users may disconnect YouTube, remove the connected YouTube account and its authorized data, delete their AudienceOwn account, or contact <a className={linkClass} href={`mailto:${supportEmail}`}>{supportEmail}</a> to request deletion of stored Google-related information when they cannot use the in-product controls.</p>
            <p>Account deletion disables connected-provider access and completes provider cleanup before deleting the AudienceOwn authentication account. These actions remove data stored by AudienceOwn; they do not delete a Google account, YouTube channel, video, or other content hosted by Google.</p>
            <p>For the available controls and the data each action removes, review the <Link className={linkClass} href="/data-deletion">Data Deletion Policy</Link>. Broader data practices are described in the <Link className={linkClass} href="/privacy">Privacy Policy</Link>, browser technologies in the <Link className={linkClass} href="/cookie-policy">Cookie Policy</Link>, and service rules in the <Link className={linkClass} href="/terms">Terms of Service</Link>.</p>
          </Section>

          <Section id="sharing" title="Data sharing">
            <p>AudienceOwn does not sell Google user data.</p>
            <p>Google user data is shared only when reasonably necessary to provide the requested service, with trusted service providers that help operate AudienceOwn and require the information to perform their services, or where disclosure is required by applicable law.</p>
          </Section>

          <Section id="limited-use" title="Google API Services User Data Policy">
            <p>AudienceOwn’s use and transfer of information received from Google APIs will adhere to the <a className={linkClass} href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements, where applicable.</p>
          </Section>

          <Section id="security" title="Security">
            <p>AudienceOwn protects Google user data through secure OAuth flows, encrypted token storage, authenticated server access, database row-level security, and least-privilege access controls. We limit provider access to the authorized connection and avoid exposing raw provider tokens to browser clients.</p>
            <p>No online system can eliminate every risk. AudienceOwn regularly reviews and improves its technical and organizational safeguards as the service evolves.</p>
          </Section>

          <Section id="changes" title="Changes to this disclosure">
            <p>We may update this page when Google APIs or policies change, AudienceOwn features change, requested OAuth scopes change, or legal requirements change. We will publish the revised disclosure here and update the date above.</p>
          </Section>

          <Section id="contact" title="Contact">
            <p>If you have questions about AudienceOwn&apos;s use of Google APIs or this disclosure, please contact <a className={linkClass} href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
          </Section>
        </div>
      </article>
    </div>
    <div className="print:hidden"><PublicFooter/></div>
  </main>;
}
