import Link from "next/link";
import { ArrowRight, Bell, CircleUserRound, KeyRound, LifeBuoy, Link2, ShieldCheck } from "lucide-react";
import { requireCreator, requireViewer } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { AiSettingsPanel } from "@/components/ai-settings-panel";
import { aiConfiguration, modelBackedAiAvailable } from "@/lib/ai/configuration";
import { UnavailableState } from "@/components/product-state";
import {BillingStatusPanel}from"@/components/billing-status-panel";import{readBillingRecord}from"@/lib/billing/read";import{getCreatorEntitlements}from"@/lib/provider-entitlements";import{logPageQueryFailure}from"@/lib/data-availability";

const sectionLink = "surface group flex min-h-36 items-start justify-between gap-5 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 motion-reduce:transform-none motion-reduce:transition-none";

export default async function SettingsPage() {
  const [user,creator]=await Promise.all([requireViewer(),requireCreator()]);const client=await createClient();
  if(!client)throw new Error("Supabase is not configured");
  const[settingsResult,usageResult,billingResult,entitlementsResult]=await Promise.all([client.from("creator_ai_settings").select("*").eq("creator_id",creator.id).maybeSingle(),client.rpc("get_ai_usage_summary"),readBillingRecord(creator.id),getCreatorEntitlements(creator.id).then(data=>({data,error:null})).catch(error=>({data:null,error}))]);
  logPageQueryFailure("settings","ai_settings",settingsResult.error);logPageQueryFailure("settings","ai_usage",usageResult.error);logPageQueryFailure("settings","billing",billingResult.error);logPageQueryFailure("settings","entitlements",entitlementsResult.error);
  const stored=settingsResult.data,usage=usageResult.data,billing=billingResult.data,entitlements=entitlementsResult.data;
  const defaults={enabled:false,preferred_model:aiConfiguration().model,preferred_variant:"standard",tone:"natural",audience_description:"",
  preferred_terminology:"",phrases_to_avoid:"",cta_style:"",custom_voice_instructions:"",include_emojis:false,include_hashtags:false,
  preserve_source_title:true,approval_required:true,ai_auto_send_enabled:false,ai_required:false,monthly_generation_limit:50,monthly_budget_minor_units:1000};
  const sections = [
    [CircleUserRound,"Profile","Manage your name, permanent URL, biography, images, and public Creator page.","/dashboard/creator-page"],
    [KeyRound,"Account",user.email??"Review sign-in details and account deletion.","/dashboard/settings/account"],
    [ShieldCheck,"Security","Manage your authenticator and sign out of this browser.","/dashboard/security"],
    [Link2,"Connected Platforms","Review OAuth and manual connections, health, permissions, and available actions.","/dashboard/settings/connected-accounts"],
    [LifeBuoy,"Recovery Pass","View your protected audience and share the Recovery Pass that is already available.","/dashboard/audience"],
  ] as const;
  return <><header><p className="eyebrow">Workspace</p><h1 className="mt-2 text-3xl font-semibold">Settings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Manage your public profile, account protection, connected platforms, and supported workspace preferences.</p></header>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{sections.map(([Icon,title,copy,href])=><Link key={href} href={href} className={sectionLink}><div><span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon aria-hidden size={19}/></span><h2 className="mt-5 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p></div><ArrowRight aria-hidden className="mt-1 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300 motion-reduce:transition-none" size={17}/></Link>)}</div>
    {billingResult.error||!entitlements?<UnavailableState className="mt-10" title="Billing unavailable" description="Your current plan and subscription status could not be established."/>:<BillingStatusPanel plan={entitlements.plan} interval={billing?.billing_interval??null} status={billing?.status??null} periodEnd={billing?.current_period_end??null} cancelAtPeriodEnd={billing?.cancel_at_period_end??false}/>}<section className="mt-10" aria-labelledby="availability-heading"><div><p className="eyebrow">Availability</p><h2 id="availability-heading" className="mt-2 text-xl font-semibold">Feature availability</h2></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><UnavailableState compact icon={Bell} title="Creator notifications are not available yet" description="Recovery Pass alert choices already belong to each fan and appear in Audience reporting."/></div></section>
    <div className="mt-10">{settingsResult.error?<UnavailableState title="AI settings unavailable" description="Saved AI preferences could not be loaded. Controls are unavailable until the current state can be established."/>:<AiSettingsPanel settings={stored??defaults} usage={usage as Record<string,unknown>|null} usageAvailable={!usageResult.error} configured={modelBackedAiAvailable()}/>}</div>
    <nav aria-label="Settings policies and support" className="mt-10 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/[.07] pt-6 text-sm text-zinc-500"><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/privacy">Privacy</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/terms">Terms</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/refund-policy">Refund Policy</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/cookie-policy">Cookie Policy</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/data-deletion">Data deletion</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/google-api-disclosure">Google API Disclosure</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/contact">Support</Link></nav>
  </>;
}
