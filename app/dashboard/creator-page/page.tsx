import Link from "next/link";
import { ArrowRight, Eye, Layers3, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { requireCreator } from "@/lib/dal";
import { CreatorForm } from "@/components/creator-form";
import { RecoveryPassCard } from "@/components/dashboard/recovery-pass-card";
import { getCreatorDashboard } from "@/lib/dashboard/creator-dashboard";
import { appUrl } from "@/lib/app-url";
import { PlatformBrandIcon } from "@/components/dashboard/platform-brand-icon";
import { platformPresentation } from "@/lib/dashboard/platform-presentation";
import "./creator-page.css";

type CanonicalCreator = { recovery_pass_name?: string | null; public_tagline?: string | null };

export default async function Page() {
  const creator = await requireCreator();
  const canonical = creator as typeof creator & CanonicalCreator;
  const data = await getCreatorDashboard(creator);
  const slug = creator.public_slug ?? "";
  const name = canonical.recovery_pass_name ?? `${creator.display_name}'s Recovery Pass`;
  const ready = Boolean(creator.public_profile_enabled && creator.recovery_pass_enabled && slug);
  const accounts = data.recoveryDestinations ?? [];

  return <main className="creator-control-center">
    <header className="creator-page-header">
      <p className="premium-eyebrow">Recovery Pass control center</p>
      <h1>Creator <span>Page</span><Sparkles aria-hidden size={20} /></h1>
      <p>Customize your Recovery Pass and control how your audience finds you.</p>
    </header>

    <div className="creator-control-grid">
      <section className="creator-identity-card" aria-labelledby="identity-title">
        <div className="creator-section-heading identity-heading"><span className="creator-icon-badge"><ShieldCheck aria-hidden size={21} /></span><div><h2 id="identity-title">Recovery Pass Identity</h2><p>Customize your Recovery Pass identity while keeping your permanent handle.</p></div></div>
        <CreatorForm profile={{ recoveryPassName: name, displayName: creator.display_name, slug, tagline: canonical.public_tagline ?? null, biography: creator.public_bio }} publicSiteUrl={appUrl()} ready={ready} />
      </section>

      <aside className="follower-experience-card" aria-labelledby="follower-title">
        <div className="follower-path" aria-hidden><span /><i /><span /><i /><span /></div><p className="premium-eyebrow">Follower Experience</p><span className="creator-icon-badge"><Eye aria-hidden size={22} /></span><h2 id="follower-title">See how your Recovery Pass works</h2><p>Preview the journey your followers will eventually use to join your recovery network and choose where they want to find you.</p><button className="creator-action creator-action-disabled" type="button" disabled aria-describedby="follower-coming-soon"><Eye aria-hidden size={16} />Preview follower experience</button><small id="follower-coming-soon"><strong>Coming soon</strong> — no opt-ins or audience records will be created.</small>
      </aside>
    </div>

    <div className="creator-lower-grid">
      <section className="creator-accounts-section" aria-labelledby="creator-accounts-title">
        <div className="creator-section-heading accounts-heading"><span className="creator-icon-badge"><Layers3 aria-hidden size={21} /></span><div><h2 id="creator-accounts-title">Your Recovery Accounts</h2><p>These accounts will appear on your Recovery Pass for your audience to choose from.</p></div></div>
        <Link className="creator-action creator-action-secondary creator-action-compact creator-section-action" href="/dashboard/platforms">Manage accounts <ArrowRight size={14} /></Link>
        {accounts.length ? <div className="creator-account-grid">{accounts.map(account => {
          const presentation = platformPresentation[account.provider] ?? { label: account.provider, color: "#a78bfa" };
          const accountReady = account.verificationState === "verified";
          const normalizedName = account.displayName.trim().replace(/^@/, "").toLocaleLowerCase();
          const distinctHandle = account.handle?.trim() && account.handle.trim().replace(/^@/, "").toLocaleLowerCase() !== normalizedName ? account.handle.trim() : null;
          return <article key={account.destinationId} style={{ "--account-tone": presentation.color } as React.CSSProperties}><div className="creator-account-provider"><PlatformBrandIcon provider={account.provider} label={presentation.label} animated /><div className="creator-account-identity"><span>{presentation.label} {account.role === "backup" && <b>Backup</b>}</span><h3>{account.displayName}</h3>{distinctHandle && <p>{distinctHandle}</p>}</div></div><div className="creator-account-metric"><strong>{account.recoveryPassOptIns}</strong><small>Recovery Pass opt-ins</small></div><span className={`creator-account-status ${accountReady ? "ready" : "action"}`}><i />{accountReady ? "Ready" : "Action required"}</span><Link className="creator-action creator-action-secondary creator-action-compact creator-account-manage" href={account.href}>Manage <ArrowRight size={13} /></Link></article>;
        })}</div> : <div className="creator-accounts-empty"><ShieldCheck size={24} /><strong>No configured Recovery Accounts yet</strong><p>Add a real Backup or recovery account to make it available on your Recovery Pass.</p></div>}
      </section>

      <section className="creator-sharing-section" aria-labelledby="sharing-title">
        <div className="creator-section-heading sharing-heading"><span className="creator-icon-badge"><Share2 aria-hidden size={21} /></span><div><h2 id="sharing-title">Recovery Pass Sharing</h2><p>Share your unique link with your audience.</p></div></div>
        <RecoveryPassCard recoveryPass={{ ...data.recoveryPass, name }} showViewAction={false} />
      </section>
    </div>
  </main>;
}
