import Link from "next/link";
import { ArrowRight, Check, Link2, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { MarketingNav } from "@/components/marketing-nav";
import { ProductPreview } from "@/components/product-preview";

export default function Home() {
  return <main className="marketing-page">
    <MarketingNav />
    <section className="hero-section">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker"><span/>Your audience. Your connection.</p>
          <h1>Your audience should never disappear with a platform.</h1>
          <p className="hero-support">Create one permanent creator page for your official accounts, recovery accounts and direct audience connection.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="button button-primary h-12 px-5">Create your permanent page <ArrowRight size={17}/></Link>
            <Link href="#how-it-works" className="button button-secondary h-12 px-5">See how it works</Link>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Check size={14} className="text-emerald-400"/>No credit card required. Publish your first page in minutes.</p>
        </div>
        <ProductPreview />
      </div>
    </section>

    <section id="product" className="marketing-section border-y border-white/[.07]">
      <div className="section-heading">
        <p className="eyebrow">A home you control</p>
        <h2>One link that stays yours.</h2>
        <p>Give your audience one reliable place to find your official presence, even when platforms change.</p>
      </div>
      <div className="feature-grid">
        {[
          [Link2, "Your official links", "Keep main and recovery accounts clearly labelled in one trusted place."],
          [Mail, "A direct connection", "Let people opt in to creator updates without relying on an algorithm."],
          [ShieldCheck, "Built around trust", "Clear identity, consent-first subscriptions and exportable audience records."],
        ].map(([Icon, title, text]) => <article className="feature-card" key={String(title)}>
          <span className="feature-icon"><Icon size={20}/></span><h3>{title as string}</h3><p>{text as string}</p>
        </article>)}
      </div>
    </section>

    <section id="how-it-works" className="marketing-section">
      <div className="section-heading"><p className="eyebrow">How it works</p><h2>Set up once. Stay findable.</h2></div>
      <div className="steps">
        {[
          ["01", "Create your page", "Choose your handle and add the identity your audience already knows."],
          ["02", "Connect your accounts", "Add official profiles and clearly marked recovery accounts."],
          ["03", "Own the connection", "Share one permanent URL and invite direct email subscriptions."],
        ].map(([n,title,text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}
      </div>
    </section>

    <section id="pricing" className="marketing-section border-y border-white/[.07]">
      <div className="pricing-panel">
        <div><p className="eyebrow">Simple start</p><h2>Build your permanent page for free.</h2><p>Create your page, connect your accounts and publish when you’re ready. No credit card required.</p></div>
        <Link href="/register" className="button button-primary h-12 px-5">Create your page <ArrowRight size={17}/></Link>
      </div>
    </section>

    <section id="faq" className="marketing-section faq-section">
      <div><p className="eyebrow">FAQ</p><h2>Questions, answered.</h2></div>
      <div>
        {[
          ["Is AudienceOwn another social network?", "No. It is your permanent creator page and a direct connection layer across the platforms you already use."],
          ["Do I need a credit card to start?", "No. You can create your account and publish your first page without a credit card."],
          ["Can I label recovery accounts?", "Yes. Official and recovery accounts are presented separately so your audience can understand what each link is for."],
        ].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </div>
    </section>

    <footer className="marketing-footer">
      <Logo/><div><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><Link href="/contact">Support</Link></div><p>© {new Date().getFullYear()} AudienceOwn</p>
    </footer>
  </main>;
}
