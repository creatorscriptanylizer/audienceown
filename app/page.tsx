import Link from "next/link";
import { ArrowRight, Check, ExternalLink, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { HeroProtectionScene } from "@/components/hero-protection-scene";
import { PublicFooter } from "@/components/public-footer";
import { PlatformBrandIcon } from "@/components/dashboard/platform-brand-icon";
import { FeatureIcon, PremiumFeatureIcon } from "@/components/feature-icon";
import { LandingPricing } from "@/components/landing-pricing";

const problems = [
  ["hacked", "red", "Accounts get hacked", "One bad day can lock you out of everything you have built."],
  ["suspended", "orange", "Platforms suspend creators", "Rules change, mistakes happen, and accounts sometimes disappear."],
  ["broken-link", "purple", "Usernames and links change", "Rebrands and broken links can leave followers wondering where you went."],
  ["restart", "blue", "Starting over is painful", "Years of work should not disappear because one account does."],
] as const;

const updates = [
  ["video", "red", "New Video", "Let followers who asked for video updates know something new is live."],
  ["livestream", "pink", "Livestream", "Invite followers who chose livestream notifications."],
  ["podcast", "purple", "Podcast Episode", "Share a new episode with followers who asked for podcast updates."],
  ["product", "orange", "Product Release", "Tell interested followers about something you have released."],
  ["event", "blue", "Event", "Invite followers who enabled event updates."],
  ["announcement", "orange", "General Announcement", "Share an important update with eligible followers."],
  ["community", "purple", "Community Update", "Keep your subscribed community informed."],
] as const;

const faq = [
  ["What is AudienceOwn?", "AudienceOwn gives creators one permanent home for their official accounts, backup accounts, and direct audience connection. It works alongside the platforms you already use, so your followers always know where to find you."],
  ["What happens if I lose access to my account?", "If YouTube, TikTok, Instagram, or another connected platform is hacked, suspended, deleted, or becomes unavailable, your AudienceOwn Recovery Pass helps your followers find their way back to your trusted AudienceOwn page, where they can reconnect through your official accounts, backup accounts, and the updates they chose to receive."],
  ["Can I connect more than one platform?", "Yes. You can connect your official platforms and backup accounts in one place. Free creators can connect one main platform and one backup platform. Pro creators can connect unlimited supported platforms and backup accounts."],
  ["How much does AudienceOwn cost?", "AudienceOwn includes a free plan to help creators protect their audience and stay connected. When you need unlimited connected platforms, unlimited Creator Updates, unlimited Emergency Recovery Alerts, and additional premium features, you can upgrade to AudienceOwn Pro."],
] as const;

export default function Home() {
  return <main className="marketing-page-v2" id="top">
    <MarketingNav />

    <section className="landing-hero" aria-labelledby="landing-heading">
      <div className="landing-hero-grid">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><Sparkles aria-hidden size={15}/>Built for creators, backed by trust</p>
          <h1 id="landing-heading"><span className="hero-headline-line">Never lose</span><span className="hero-headline-line hero-headline-focus">your audience,</span><span className="hero-headline-line">again.</span></h1>
          <p className="landing-hero-promise">Your followers should always know where to find you.</p>
          <p className="landing-hero-body">One account should never be able to erase everything you have built. If your account is hacked, suspended, deleted, or you simply decide to move on, AudienceOwn gives your followers one trusted place to reconnect with you through your official accounts, backup accounts, and the updates they chose to receive.</p>
          <div className="landing-actions"><Link href="/register" className="button button-primary landing-primary">Create your page, it&apos;s free <ArrowRight aria-hidden size={18}/></Link><Link href="#how-it-works" className="button button-secondary landing-secondary">See how it works</Link></div>
          <ul className="landing-trust-notes" aria-label="Getting started">{["No credit card required","Set up in minutes","Your permanent link stays yours"].map((note,index)=><li style={{"--check-index":index} as React.CSSProperties} key={note}><Check aria-hidden/>{note}</li>)}</ul>
        </div>
        <HeroProtectionScene />
      </div>
    </section>

    <section className="proof-strip" id="how-it-works" aria-label="AudienceOwn capabilities">
      {[["recovery","Recovery Pass","Give your followers a way back."],["audience","Direct audience connection","Reach followers who chose to hear from you."],["platforms","Connected Platforms","Keep the accounts you use in one place."],["backups","Creator controlled backups","Show followers exactly where to find you next."]].map(([kind,title,text])=><article key={title}><PremiumFeatureIcon kind={kind as "recovery"} label={`${title} icon`}/><div><h2>{title}</h2><p>{text}</p></div></article>)}
    </section>

    <section className="landing-section" id="product"><header className="landing-section-heading"><p className="landing-eyebrow">The problem</p><h2>Your audience shouldn&apos;t disappear because one account does.</h2><p>Accounts get hacked. Platforms suspend creators. AudienceOwn ensures your followers always find you again.</p></header><div className="problem-grid">{problems.map(([kind,tone,title,text])=><article className={`motion-card accent-${tone}`} key={title}><PremiumFeatureIcon kind={kind} label={`${title} icon`}/><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="landing-section solution-section"><header className="landing-section-heading"><p className="landing-eyebrow">The solution</p><h2>One permanent home for everything you create.</h2><p>Your followers get one trusted link. You get a clearer way to manage every connection.</p></header><div className="solution-grid"><article className="solution-home"><PremiumFeatureIcon kind="creator-page" label="Verified Creator Page icon"/><p className="card-kicker">Creator Page</p><h3>Your permanent Creator Page</h3><p>One link your followers can always trust.</p><div className="mini-url">audienceown.com/yourname <ExternalLink aria-hidden size={15}/></div></article><article className="solution-accounts"><div><p className="card-kicker">Official Accounts</p><h3>Your real accounts, clearly identified.</h3><div className="provider-pills">{["youtube","instagram","tiktok","x"].map(provider=><span key={provider}><PlatformBrandIcon provider={provider} label={provider} size="sm" animated/>{provider==="x"?"X":provider[0].toUpperCase()+provider.slice(1)}</span>)}</div></div><div><p className="card-kicker">Backup Accounts</p><h3>A clear next step when something goes wrong.</h3><div className="provider-pills backup"><span><PlatformBrandIcon provider="youtube" label="YouTube Backup" size="sm"/>YouTube <small><ShieldCheck aria-hidden/>Backup</small></span><span><PlatformBrandIcon provider="twitch" label="Twitch Backup" size="sm"/>Twitch <small><ShieldCheck aria-hidden/>Backup</small></span></div></div></article><article className="solution-direct"><PremiumFeatureIcon kind="communication" label="Direct audience notification icon"/><p className="card-kicker">Direct Audience</p><h3>Let followers choose what they want to hear about.</h3><div className="subscription-mini"><span>you@example.com</span><b>Join Recovery Pass <ArrowRight aria-hidden/></b></div><small>Consent first. Easy to manage.</small></article></div></section>

    <section className="landing-section" id="connected-platforms"><header className="landing-section-heading"><p className="landing-eyebrow">Connect everything</p><h2>Connect the platforms you already use.</h2><p>Use any account you already have. Connect supported platforms instantly, or add any public profile or website manually.</p></header><div className="provider-grid">{[["youtube","YouTube","OAuth available"],["instagram","Instagram","OAuth available"],["tiktok","TikTok","Manual connection"],["x","X","Manual connection"],["twitch","Twitch","Manual connection"],["facebook","Facebook","Manual connection"],["discord","Discord","Manual connection"],["website","Website","Manual connection"],["podcast","Podcast","Manual connection"],["newsletter","Newsletter","Direct connection"],["more","More","Coming later"]].map(([provider,name,status])=><article key={name}><PlatformBrandIcon provider={provider} label={name} animated/><div><h3>{name}</h3><p>{status}</p></div><i className={status==="OAuth available"?"available":status==="Coming later"?"later":"manual"}/></article>)}</div></section>

    <section className="landing-section recovery-showcase" id="recovery-pass"><header className="landing-section-heading"><p className="landing-eyebrow">Recovery Pass</p><h2>Your safety net when everything changes.</h2><p>If you lose access to a platform, followers who chose to stay connected still have a way to find you.</p></header><div className="recovery-flow">{[["lost-access","You lose access","An account is hacked, suspended, deleted, or unavailable."],["recovery-alert","You send a recovery alert","Eligible creators can notify their protected followers."],["followers-notified","Followers see your backup accounts","They receive information through the options they chose."],["found-again","They find you again","Your permanent page gives followers a trusted place to reconnect."]].map(([kind,title,text],index)=><article style={{"--reveal-index":index} as React.CSSProperties} key={title}><span className="flow-number">0{index+1}</span><PremiumFeatureIcon kind={kind as "lost-access"} label={`${title} icon`}/><h3>{title}</h3><p>{text}</p>{index<3&&<ArrowRight className="flow-arrow" aria-hidden/>}</article>)}</div></section>

    <section className="landing-section" id="creator-updates"><header className="landing-section-heading"><p className="landing-eyebrow">Share updates that matter</p><h2>Send the right updates to the right followers.</h2><p>Followers choose what they want to receive, so every message has a reason to be there.</p></header><div className="updates-grid">{updates.map(([kind,tone,title,text])=><article className={`motion-card accent-${tone} update-card-${kind}`} key={title}><PremiumFeatureIcon kind={kind} label={`${title} icon`}/><h3>{title}</h3><p>{text}</p><small className={`update-category-badge update-category-${kind}`}><i aria-hidden/>Creator Update</small></article>)}</div></section>

    <section className="landing-section platform-health"><header className="landing-section-heading"><p className="landing-eyebrow">Platform health</p><h2>Know what is happening before it becomes a problem.</h2><p>Connection states use clear language, so you know when to act and when everything is fine.</p></header><div className="health-grid">{[["youtube","YouTube","Healthy","Last synced 2 minutes ago","healthy"],["instagram","Instagram","Healthy","OAuth connected","healthy"],["tiktok","TikTok","Syncing","Checking the connection","syncing"],["x","X","Action required","Reconnect","attention"],["twitch","Twitch","Disconnected","Reconnect","critical"],["more","Add Platform","Temporarily unavailable","Try again later","offline"]].map(([provider,name,state,detail,tone])=><article key={name}><div><PlatformBrandIcon provider={provider} label={name} animated/><i className={tone}/></div><h3>{name}</h3><strong>{state}</strong><p>{detail}</p></article>)}</div></section>

    <LandingPricing />

    <section className="landing-section faq-v2" id="faq"><header><p className="landing-eyebrow">FAQ</p><h2>Questions creators ask before getting started.</h2><p>Everything you need to know before creating your AudienceOwn page.</p></header><div>{faq.map(([q,a])=><details name="landing-faq" key={q}><summary>{q}<span aria-hidden>+</span></summary><p>{a}</p></details>)}</div></section>

    <section className="final-cta"><div><FeatureIcon icon={HeartHandshake} tone="pink"/><p className="landing-eyebrow">Your followers are worth protecting</p><h2>Give your followers one place they can always find you.</h2><p>Free forever, upgrade whenever you need more.</p><Link href="/register" className="button landing-final-button">Create your page, it&apos;s free <ArrowRight aria-hidden/></Link></div></section>
    <PublicFooter />
  </main>;
}
