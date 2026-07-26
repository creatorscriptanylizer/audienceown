import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Circle, ExternalLink, FileUser, Link2, LockKeyhole, Radio, ShieldCheck, Sparkles, Users } from "lucide-react";
import { setPublication } from "@/app/actions/creator";
import { SubmitButton } from "@/components/submit-button";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export default async function Page() {
  const creator = await requireCreator();
  const supabase = (await createClient())!;
  const [{ data: accounts }, { data: subscribers }] = await Promise.all([
    supabase.from("connected_accounts").select("id,platform,account_type,label,url,is_public,is_primary,position,created_at").eq("creator_id", creator.id).order("position"),
    supabase.from("follower_connections").select("id,created_at,status").eq("creator_id", creator.id).order("created_at", { ascending: false }),
  ]);
  const allAccounts = accounts ?? [];
  const officialAccounts = allAccounts.filter((account) => account.account_type === "official");
  const backupAccounts = allAccounts.filter((account) => account.account_type === "backup");
  const activeSubscribers = (subscribers ?? []).filter((subscriber) => subscriber.status === "active");
  const media = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("creator-media").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };
  const [profileImage, bannerImage] = await Promise.all([
    media(creator.profile_image_path),
    media(creator.banner_image_path),
  ]);
  const checklist = [
    { label: "Claimed URL", complete: Boolean(creator.public_slug), href: "/dashboard/creator-page#profile" },
    { label: "Profile photo", complete: Boolean(creator.profile_image_path), href: "/dashboard/creator-page#images" },
    { label: "Banner", complete: Boolean(creator.banner_image_path), href: "/dashboard/creator-page#images" },
    { label: "Biography", complete: Boolean(creator.public_bio), href: "/dashboard/creator-page#profile" },
    { label: "Official account", complete: officialAccounts.length > 0, href: "/dashboard/platforms" },
    { label: "Publish page", complete: creator.public_profile_enabled, href: "/dashboard/creator-page#publication" },
  ];
  const completed = checklist.filter((item) => item.complete).length;
  const completion = Math.round((completed / checklist.length) * 100);
  const nextStep = checklist.find((item) => !item.complete);
  const activity = [
    ...activeSubscribers.slice(0, 3).map((subscriber) => ({ label: "A fan protected their connection", date: subscriber.created_at, icon: Users })),
    ...officialAccounts.slice(0, 2).map((account) => ({ label: `${account.label} added as an official account`, date: account.created_at, icon: ShieldCheck })),
    ...(creator.public_profile_enabled ? [{ label: "Your creator page was published", date: creator.updated_at, icon: Sparkles }] : []),
    { label: `You claimed audienceown.com/c/${creator.public_slug}`, date: creator.created_at, icon: Check },
    { label: "Your creator identity was created", date: creator.created_at, icon: FileUser },
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 5);
  const quickActions = [
    { href: "/dashboard/creator-page", label: "Edit page", description: "Shape your identity and story.", icon: FileUser },
    { href: "/dashboard/platforms", label: "Manage platforms", description: "Verify where people can find you.", icon: Link2 },
    { href: "/dashboard/audience", label: "Audience", description: "Care for your direct connections.", icon: Users },
    { href: "/dashboard/security", label: "Security", description: "Protect the asset you own.", icon: LockKeyhole },
  ];

  return <div className="dashboard-home">
    <section className="dashboard-hero">
      <div>
        <p className="dashboard-greeting">{greeting()}, {creator.display_name}</p>
        <p className="eyebrow mt-7">Your permanent creator page</p>
        <h1 className="creator-url"><span>audienceown.com/c/</span>{creator.public_slug}</h1>
        <p className="dashboard-hero-copy">This is your permanent home on the internet — a page and audience connection you own.</p>
      </div>
      <div className="dashboard-hero-actions">
        {creator.public_profile_enabled ? <>
          <Link className="button button-primary" href={`/c/${creator.public_slug}`} target="_blank">Preview page <ExternalLink size={15}/></Link>
          <Link className="button button-secondary" href="/dashboard/creator-page">Edit page</Link>
        </> : <>
          <form action={async (data) => { "use server"; await setPublication({}, data); }}><input type="hidden" name="enabled" value="true"/><SubmitButton className="button button-primary">Publish page</SubmitButton></form>
          <Link className="button button-secondary" href="#live-preview">Preview draft</Link>
        </>}
      </div>
    </section>

    <section className="dashboard-primary-grid">
      <article className="completion-card">
        <div className="completion-heading"><div><p className="eyebrow">Your next milestone</p><h2>Complete your page</h2></div><strong>{completion}%</strong></div>
        <div className="completion-track" aria-label={`${completion}% complete`}><span style={{ width: `${completion}%` }}/></div>
        <p className="completion-summary">{nextStep ? `${checklist.length - completed} ${checklist.length - completed === 1 ? "step" : "steps"} left. Next: ${nextStep.label}.` : "Your page is complete and ready to share."}</p>
        <div className="completion-list">
          {checklist.map((item) => <Link key={item.label} href={item.href} className={item.complete ? "is-complete" : ""}>
            <span>{item.complete ? <Check size={15}/> : <Circle size={15}/>}</span><span>{item.label}</span>{!item.complete && <ArrowRight className="completion-arrow" size={15}/>}
          </Link>)}
        </div>
      </article>

      <article id="live-preview" className="live-preview-section">
        <div className="section-label-row"><div><p className="eyebrow">Live preview</p><h2>Your page, taking shape</h2></div><span className={creator.public_profile_enabled ? "status-live" : "status-draft"}><i/>{creator.public_profile_enabled ? "Live" : "Draft"}</span></div>
        <div className="page-preview">
          <div className="page-preview-banner">{bannerImage ? <Image src={bannerImage} alt="" width={900} height={280} className="h-full w-full object-cover"/> : <div className="preview-placeholder"><Sparkles size={18}/><span>Your banner</span></div>}</div>
          <div className="page-preview-body">
            <div className="page-preview-avatar">{profileImage ? <Image src={profileImage} alt="" width={80} height={80} className="h-full w-full object-cover"/> : <Radio size={21}/>}</div>
            <h3>{creator.display_name}</h3><p className="preview-handle">@{creator.public_slug}</p>
            <p className="preview-bio">{creator.public_bio || "Add a biography to tell people who you are and why they should stay connected."}</p>
            <div className="preview-accounts">
              {officialAccounts.filter((account) => account.is_public).slice(0, 3).map((account) => <span key={account.id}><ShieldCheck size={12}/>{account.label}</span>)}
              {officialAccounts.length === 0 && <Link href="/dashboard/platforms"><Link2 size={12}/> Add your first official account</Link>}
            </div>
          </div>
        </div>
      </article>
    </section>

    <section className="dashboard-section">
      <div className="section-heading-left"><p className="eyebrow">Your workspace</p><h2>Keep building</h2></div>
      <div className="quick-action-grid">{quickActions.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} className="quick-action-card"><span className="quick-action-icon"><Icon size={19}/></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight className="quick-action-arrow" size={17}/></Link>)}</div>
    </section>

    <section className="dashboard-lower-grid">
      <article className="dashboard-section stats-section">
        <div className="section-heading-left"><p className="eyebrow">What you own</p><h2>Your foundation</h2></div>
        <div className="simple-stats">
          <Link href="/dashboard/audience"><span>Protected fans</span><strong>{activeSubscribers.length || "Ready to grow"}</strong><small>{activeSubscribers.length ? "people who can always find you" : "Share your Recovery Pass to protect your first fan"}</small></Link>
          <Link href="/dashboard/platforms"><span>Official accounts</span><strong>{officialAccounts.length || "Add yours"}</strong><small>{officialAccounts.length ? "verified places to find you" : "Connect the account your audience knows"}</small></Link>
          <Link href="/dashboard/platforms"><span>Backup accounts</span><strong>{backupAccounts.length || "Stay protected"}</strong><small>{backupAccounts.length ? "fallback places you control" : "Add a backup place your audience can reach you"}</small></Link>
        </div>
      </article>
      <article className="dashboard-section activity-section">
        <div className="section-heading-left"><p className="eyebrow">Recent activity</p><h2>Your page history</h2></div>
        <div className="activity-timeline">{activity.map(({ label, date, icon: Icon }, index) => <div key={`${label}-${index}`}><span className="activity-icon"><Icon size={15}/></span><p>{label}<small>{formatActivityDate(date)}</small></p></div>)}</div>
        {activeSubscribers.length === 0 && <div className="activity-prompt"><p>Waiting for your first protected fan</p><span>Share your Recovery Pass in your social bio.</span></div>}
      </article>
    </section>
  </div>;
}
