import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PublicFooter } from "@/components/public-footer";
import { publicSiteConfig } from "@/lib/public-site-config";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How AudienceOwn uses cookies, browser storage, and similar technologies for authentication, security, and Recovery Pass features.",
  alternates: { canonical: "/cookie-policy" },
  openGraph: {
    title: "Cookie Policy · AudienceOwn",
    description: "How AudienceOwn uses cookies, browser storage, and similar technologies for authentication, security, and browser-local features.",
    url: "/cookie-policy",
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

export default function CookiePolicyPage() {
  const { supportEmail } = publicSiteConfig();

  return <main className="min-h-screen bg-[#07070b] text-white print:bg-white print:text-black">
    <header className="border-b border-white/[.07] print:hidden"><div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-5 lg:px-8"><Logo/><Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400">Back to AudienceOwn</Link></div></header>
    <div className="mx-auto max-w-[1180px] px-5 py-12 lg:px-8 lg:py-20">
      <article className="max-w-[760px]">
        <header>
          <h1 className="text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Cookie Policy</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium text-violet-300 print:text-zinc-700"><p>Last updated: August 5, 2026</p><p>Effective date: August 5, 2026</p></div>
          <p className="mt-6 text-lg leading-8 text-zinc-300 print:text-zinc-800">This Cookie Policy explains how AudienceOwn uses cookies, browser storage, and similar technologies when you visit our websites or use our services.</p>
        </header>

        <div className="mt-12 space-y-10">
          <Section id="introduction" title="Introduction"><p>A cookie is a small piece of data that a website stores through your browser. Cookies can help a service recognize a browser, maintain a secure session, and remember information between requests. Similar technologies, including local storage, can keep information on your device for related purposes.</p><p>This policy describes the cookies, browser storage, and similar technologies AudienceOwn currently uses, why we use them, and the choices available to you. It should be read with our <Link className={legalLink} href="/privacy">Privacy Policy</Link> and <Link className={legalLink} href="/terms">Terms of Service</Link>.</p></Section>

          <Section id="strictly-necessary" title="Essential (Strictly Necessary) Cookies"><p>AudienceOwn uses cookies that are necessary to operate secure account features. These cookies support sign-in, session continuity, account protection, and OAuth connection flows. Because these functions are essential to the service you request, disabling the cookies may prevent sign-in or Connected Platform features from working correctly.</p></Section>

          <Section id="authentication" title="Authentication cookies"><p>AudienceOwn uses Supabase Auth to maintain authenticated sessions. Authentication cookies allow the service to recognize a signed-in browser, keep a Creator signed in between requests, refresh a session when appropriate, and prevent unauthorized access to protected areas. Signing out clears the cookie-backed AudienceOwn session for that browser.</p><p>Authentication cookies contain session information used by the service. AudienceOwn does not place passwords or raw Connected Platform access tokens in browser storage.</p></Section>

          <Section id="security" title="Security cookies"><p>AudienceOwn uses short-lived cookies during supported OAuth flows to help confirm that an authorization response belongs to the connection request that started it. These cookies help protect against request forgery and unauthorized account connections, and they are removed or expire after the flow.</p><p>Cookies may also support secure session maintenance, request verification, fraud prevention, and protection against suspicious account activity. AudienceOwn does not use these security cookies for advertising.</p></Section>

          <Section id="preferences" title="Preference cookies"><p>AudienceOwn does not currently use separate cookies to remember theme, language, or display preferences. If AudienceOwn introduces preference cookies, we will use them to remember choices you make and update this policy where appropriate.</p></Section>

          <Section id="performance" title="Performance cookies"><p>AudienceOwn does not currently use performance cookies to measure page speed or browser behavior. If we introduce them, we will describe their purpose and provide choices where required.</p></Section>

          <Section id="analytics" title="Analytics cookies"><p>AudienceOwn does not currently use analytics cookies or a third-party browser analytics service. Product and recovery analytics described elsewhere in the service are generated from operational records and do not currently depend on analytics cookies placed in your browser.</p><p>If AudienceOwn introduces optional analytics cookies, we will identify their purpose, update this policy, and provide consent or preference controls where required. AudienceOwn does not currently use marketing or advertising cookies.</p></Section>

          <Section id="local-storage" title="Local storage"><p>AudienceOwn uses local storage in supported public experiences to keep certain information on your device. The application stores Recovery Pass participation details, including contact information, consent status, notification preferences, a member number, and a preference-management token. It can also read locally saved Creator page information when present. This supports browser-local Recovery Pass state and preference updates.</p><p>Local storage remains on the device until the application or user removes it, or browser data is cleared. People who share a browser or device should consider who can access information stored there. AudienceOwn does not store raw OAuth access tokens or Connected Platform credentials in local storage.</p></Section>

          <Section id="other-browser-storage" title="Session storage and IndexedDB"><p>AudienceOwn does not currently use session storage or IndexedDB. If either technology is introduced, we will describe its purpose here when appropriate.</p></Section>

          <Section id="third-party-services" title="Third-party services"><p>Independent services, including Google, YouTube, TikTok, Instagram, X, Twitch, and other Connected Platforms, may place or read their own cookies when you visit their sites or complete their authentication and OAuth flows. Their cookies are governed by their own terms and privacy policies.</p><p>AudienceOwn does not control cookies placed directly by independent providers. Connecting a platform does not allow AudienceOwn to read unrelated cookies belonging to that provider.</p></Section>

          <Section id="managing-cookies" title="Managing cookies and browser storage"><p>You can review, delete, or block cookies through your browser settings. Browsers also provide controls for clearing local storage and other site data. The exact controls depend on your browser, operating system, and device.</p><p>Blocking strictly necessary authentication or security cookies may prevent you from signing in, maintaining a secure session, or connecting a Connected Platform. Deleting cookies or browser storage does not automatically delete an AudienceOwn account or information stored on AudienceOwn servers. Account deletion and server-side data removal are governed by our <Link className={legalLink} href="/privacy">Privacy Policy</Link> and <Link className={legalLink} href="/data-deletion">Data Deletion Policy</Link>.</p></Section>

          <Section id="future-optional-cookies" title="Future optional cookies"><p>AudienceOwn may introduce optional cookies for preferences, performance, or analytics as the service develops. We will not describe those cookies as active before they are implemented. If they are added, we will update this policy and request consent where required by applicable law.</p><p>If AudienceOwn introduces optional cookies that require consent under applicable law, users will be able to review and update their preferences using the controls provided at that time. No cookie preference banner or settings center is currently provided because the application does not currently use optional analytics, marketing, or advertising cookies.</p></Section>

          <Section id="changes" title="Changes to this policy"><p>We may update this Cookie Policy when browser technologies, service features, providers, or legal requirements change. We will post the revised policy and update the date above. If a change materially affects your choices, we will provide additional notice where appropriate.</p></Section>

          <Section id="contact" title="Contact us"><p>Questions about cookies or browser storage can be sent to <a className={legalLink} href={`mailto:${supportEmail}`}>{supportEmail}</a>. You can also review our <Link className={legalLink} href="/privacy">Privacy Policy</Link>, <Link className={legalLink} href="/terms">Terms of Service</Link>, and <Link className={legalLink} href="/refund-policy">Refund Policy</Link>.</p></Section>
        </div>
      </article>
    </div>
    <div className="print:hidden"><PublicFooter/></div>
  </main>;
}
