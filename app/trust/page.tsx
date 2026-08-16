import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Cookie, CreditCard, Database, Eye, FileText, KeyRound, LockKeyhole, Mail, Scale, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Logo } from "@/components/logo";
import { PublicFooter } from "@/components/public-footer";
import { publicSiteConfig } from "@/lib/public-site-config";

export const metadata: Metadata = {
  title: "Trust Center",
  description: "Clear information about privacy, platform connections, billing, data deletion, and legal terms at AudienceOwn.",
  alternates: { canonical: "/trust" },
  openGraph: {
    title: "Trust Center · AudienceOwn",
    description: "Understand how your account, audience, platform connections, billing, and data are handled.",
    url: "/trust",
    siteName: "AudienceOwn",
    type: "website",
    images: [{ url: "/trust/opengraph-image.png", width: 1536, height: 1024, alt: "AudienceOwn Trust Center" }],
  },
};

const resources = [
  [Eye, "Privacy Policy", "/privacy", "Learn what information we collect, why we use it, and the choices available to you."],
  [Scale, "Terms of Service", "/terms", "Understand the rules and responsibilities that apply when you use the service."],
  [Cookie, "Cookie Policy", "/cookie-policy", "See how cookies and browser storage support sign in, preferences, and core features."],
  [CreditCard, "Refund Policy", "/refund-policy", "Find out when a purchase may be eligible for a refund and how to request one."],
  [KeyRound, "Google API Disclosure", "/google-api-disclosure", "Learn what Google and YouTube access you can authorize and how that access is used."],
  [Database, "Data Deletion Policy", "/data-deletion", "Find out how to disconnect a platform, remove stored information, or delete an account."],
] as const;

const principles = [
  [LockKeyhole, "Privacy", "We collect only the information needed to provide the service and protect it with care."],
  [Eye, "Transparency", "You should always be able to understand how your information and connected services are handled."],
  [SlidersHorizontal, "Creator control", "You decide which platforms to connect, what to share, and when to disconnect them."],
  [ShieldCheck, "Security", "We build safeguards into your account and the actions that need extra protection."],
  [FileText, "Accountability", "We keep our public policies clear, current, and easy to find."],
] as const;

const trustSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "AudienceOwn Trust Center",
  description: "AudienceOwn resources for privacy, Connected Platforms, billing, data deletion, and legal information.",
};

const focus = "focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400";
const card = "h-full rounded-3xl border border-white/[.08] bg-white/[.025] transition duration-300 hover:-translate-y-1 hover:border-white/[.16] hover:bg-white/[.045] hover:shadow-2xl hover:shadow-violet-950/15 motion-reduce:transform-none motion-reduce:transition-none";

export default function TrustCenterPage() {
  const { supportEmail, privacyEmail } = publicSiteConfig();

  return <main className="min-h-screen overflow-hidden bg-[#07070b] text-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(trustSchema) }}/>
    <header className="relative z-20 border-b border-white/[.07] bg-[#07070b]/85 backdrop-blur"><div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 lg:px-8"><Logo/><nav aria-label="Trust Center navigation" className="flex items-center gap-5 text-sm text-zinc-400"><Link className={`${focus} hidden transition-colors hover:text-white sm:inline`} href="#resources">Trust resources</Link><Link className={`button button-secondary h-10 px-4 text-sm ${focus}`} href="/login">Sign in</Link></nav></div></header>

    <section className="relative isolate border-b border-white/[.07]"><div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_10%,rgba(124,58,237,.24),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(34,211,238,.08),transparent_25%)]"/><div className="mx-auto max-w-[1200px] px-5 py-24 sm:py-32 lg:px-8 lg:py-40"><div className="max-w-4xl"><p className="eyebrow">AudienceOwn Trust Center</p><h1 className="mt-5 text-5xl font-semibold leading-[.98] tracking-[-.055em] text-balance sm:text-6xl lg:text-7xl">Trust starts with clarity.</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-300 sm:text-xl">We believe you should understand how the platform works before trusting it with your account, your information, and the audience you have built.</p><Link href="#resources" className={`button button-primary mt-10 h-12 w-full justify-center px-5 sm:w-auto ${focus}`}>Explore Trust resources <ArrowUpRight size={17}/></Link></div></div></section>

    <section className="mx-auto max-w-[1200px] px-5 py-20 sm:py-28 lg:px-8" aria-labelledby="understand-heading"><div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-start"><div><p className="eyebrow">Know where you stand</p><h2 id="understand-heading" className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Important answers, in one place.</h2></div><p className="max-w-2xl text-lg leading-8 text-zinc-400">Find clear answers about your information, platform connections, billing, data removal, and the terms that apply, all in one place.</p></div></section>

    <section id="resources" className="scroll-mt-8 border-y border-white/[.07] bg-white/[.015]" aria-labelledby="resources-heading"><div className="mx-auto max-w-[1200px] px-5 py-20 sm:py-28 lg:px-8"><div className="max-w-2xl"><p className="eyebrow">Trust resources</p><h2 id="resources-heading" className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Choose what you want to understand.</h2><p className="mt-4 leading-7 text-zinc-400">Each resource is written for a specific question, so you can get to the right answer quickly.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{resources.map(([Icon,title,href,copy])=><Link href={href} className={`${card} ${focus} group p-7`} key={href}><div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><Icon size={20}/></span><ArrowUpRight className="text-zinc-600 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-300 motion-reduce:transform-none motion-reduce:transition-none" size={18}/></div><h3 className="mt-8 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p></Link>)}</div></div></section>

    <section className="mx-auto max-w-[1200px] px-5 py-20 sm:py-28 lg:px-8" aria-labelledby="principles-heading"><div className="max-w-2xl"><p className="eyebrow">Trust principles</p><h2 id="principles-heading" className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Simple principles behind the product.</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{principles.map(([Icon,title,copy])=><article className={`${card} p-6`} key={title}><span className="grid size-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Icon size={18}/></span><h3 className="mt-7 font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p></article>)}</div></section>

    <section className="border-t border-white/[.07] bg-white/[.015]" aria-labelledby="help-heading"><div className="mx-auto max-w-[1200px] px-5 py-20 sm:py-24 lg:px-8"><div className="overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[linear-gradient(135deg,rgba(124,58,237,.12),rgba(255,255,255,.025))] p-8 sm:p-10 lg:p-12"><span className="grid size-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><Mail size={21}/></span><p className="eyebrow mt-8">Need help?</p><h2 id="help-heading" className="mt-3 text-3xl font-semibold tracking-[-.04em]">We’re here to help.</h2><div className="mt-8 grid gap-4 md:grid-cols-2"><Link href="/contact?topic=account_sign_in" className={`${card} ${focus} group p-6`}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-white">Support</p><h3 className="mt-1 break-all font-semibold text-violet-200">{supportEmail}</h3></div><ArrowUpRight className="mt-1 shrink-0 text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-300 motion-reduce:transform-none motion-reduce:transition-none" size={17}/></div><p className="mt-4 text-sm leading-6 text-zinc-400">For account access, billing, platform connections, and general support.</p></Link><Link href="/contact?topic=privacy_request" className={`${card} ${focus} group p-6`}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-white">Privacy</p><h3 className="mt-1 break-all font-semibold text-violet-200">{privacyEmail}</h3></div><ArrowUpRight className="mt-1 shrink-0 text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-300 motion-reduce:transform-none motion-reduce:transition-none" size={17}/></div><p className="mt-4 text-sm leading-6 text-zinc-400">For privacy questions, data requests, Google API questions, and personal information.</p></Link></div></div></div></section>

    <section className="border-t border-white/[.07]" aria-labelledby="ongoing-trust-heading"><div className="mx-auto max-w-[1200px] px-5 py-16 sm:py-20 lg:px-8"><div className="max-w-3xl"><p className="eyebrow">An ongoing commitment</p><h2 id="ongoing-trust-heading" className="mt-3 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">Building trust takes ongoing work.</h2><p className="mt-4 leading-7 text-zinc-400">As the platform grows, these resources will reflect policy changes, product improvements, and new ways of working, so you always know where you stand.</p></div></div></section>

    <PublicFooter/>
  </main>;
}
