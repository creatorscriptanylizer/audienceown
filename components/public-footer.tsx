import Link from "next/link";
import { ArrowUp, ArrowUpRight, LifeBuoy, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { publicSiteConfig } from "@/lib/public-site-config";

const footerFocus = "focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400";
const footerLink = `w-fit text-sm leading-6 text-zinc-400 transition-colors duration-200 hover:text-white motion-reduce:transition-none ${footerFocus}`;
const heading = "text-xs font-semibold uppercase tracking-[.14em] text-zinc-200";

export function PublicFooter() {
  const { supportEmail, privacyEmail } = publicSiteConfig();

  return <footer className="border-t border-white/[.08] bg-[#07070a] text-white" aria-label="AudienceOwn footer">
    <div className="mx-auto max-w-[1200px] px-5 py-16 sm:py-20 lg:px-8 lg:py-24">
      <div className="grid items-stretch gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16 xl:grid-cols-[1.2fr_.9fr_.75fr_.75fr_1.4fr]">
        <section className="h-full sm:col-span-2 lg:col-span-1" aria-label="About AudienceOwn">
          <div className="[&>a]:focus-visible:rounded-sm [&>a]:focus-visible:outline [&>a]:focus-visible:outline-2 [&>a]:focus-visible:outline-offset-4 [&>a]:focus-visible:outline-violet-400"><Logo/></div>
          <p className="mt-7 max-w-xs whitespace-pre-line text-lg font-medium leading-8 tracking-[-.02em] text-zinc-100">Protect your audience.{"\n"}Keep your connection.{"\n"}Never lose your community.</p>
        </section>

        <nav className="h-full" aria-label="Trust resources">
          <h2 className={heading}>Trust</h2>
          <ul className="mt-6 space-y-3">
            <li><Link className={footerLink} href="/trust">Trust Center</Link></li>
            <li><Link className={footerLink} href="/privacy">Privacy Policy</Link></li>
            <li><Link className={footerLink} href="/terms">Terms of Service</Link></li>
            <li><Link className={footerLink} href="/cookie-policy">Cookie Policy</Link></li>
            <li><Link className={footerLink} href="/refund-policy">Refund Policy</Link></li>
            <li><Link className={footerLink} href="/google-api-disclosure">Google API Disclosure</Link></li>
            <li><Link className={footerLink} href="/data-deletion">Data Deletion Policy</Link></li>
          </ul>
        </nav>

        <nav className="h-full" aria-label="Product links">
          <h2 className={heading}>Product</h2>
          <ul className="mt-6 space-y-3">
            <li><Link className={footerLink} href="/#product">Features</Link></li>
            <li><Link className={footerLink} href="/#how-it-works">How it works</Link></li>
            <li><Link className={footerLink} href="/#pricing">Pricing</Link></li>
            <li><Link className={footerLink} href="/#product">Creator Page</Link></li>
            <li><Link className={footerLink} href="/#recovery-pass">Recovery Pass</Link></li>
            <li><Link className={footerLink} href="/#faq">FAQ</Link></li>
            <li><Link className={footerLink} href="/contact">Support</Link></li>
          </ul>
        </nav>

        <nav className="h-full" aria-label="Company links" id="resources">
          <h2 className={heading}>Resources</h2>
          <ul className="mt-6 space-y-3">
            <li><Link className={footerLink} href="/">Home</Link></li>
            <li><Link className={footerLink} href="/#faq">FAQ</Link></li>
            <li><Link className={footerLink} href="/contact">Support</Link></li>
            <li><Link className={footerLink} href="/contact">Contact</Link></li>
          </ul>
        </nav>

        <section className="flex h-full flex-col sm:col-span-2 lg:col-span-3 xl:col-span-1" aria-labelledby="footer-help-heading">
          <h2 id="footer-help-heading" className={heading}>Need help?</h2>
          <div className="mt-6 grid flex-1 auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Link href="/contact?topic=account_sign_in" className={`group flex h-full min-w-0 flex-col rounded-2xl border border-white/[.08] bg-white/[.025] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-300/25 hover:bg-white/[.045] motion-reduce:transform-none motion-reduce:transition-none ${footerFocus}`}>
              <div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><LifeBuoy aria-hidden size={17}/></span><ArrowUpRight aria-hidden className="text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-300 motion-reduce:transform-none motion-reduce:transition-none" size={16}/></div>
              <h3 className="mt-5 text-sm font-semibold">Support</h3>
              <p className="mt-1 break-all text-sm text-violet-300">{supportEmail}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">Account access, billing, and general support.</p>
            </Link>
            <Link href="/contact?topic=privacy_request" className={`group flex h-full min-w-0 flex-col rounded-2xl border border-white/[.08] bg-white/[.025] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-300/25 hover:bg-white/[.045] motion-reduce:transform-none motion-reduce:transition-none ${footerFocus}`}>
              <div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><ShieldCheck aria-hidden size={17}/></span><ArrowUpRight aria-hidden className="text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-300 motion-reduce:transform-none motion-reduce:transition-none" size={16}/></div>
              <h3 className="mt-5 text-sm font-semibold">Privacy</h3>
              <p className="mt-1 break-all text-sm text-violet-300">{privacyEmail}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">Privacy requests, data deletion, and Google API questions.</p>
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-16 flex flex-col gap-5 border-t border-white/[.08] pt-7 text-xs text-zinc-500 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 AudienceOwn. All rights reserved.</p>
        <nav aria-label="Footer utility links">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <li><Link className={`${footerLink} text-xs`} href="/contact">Contact</Link></li>
            <li><a className={`${footerLink} inline-flex items-center gap-1.5 text-xs`} href="#">Back to top <ArrowUp aria-hidden size={13}/></a></li>
          </ul>
        </nav>
      </div>
    </div>
  </footer>;
}
