import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { requireCreator, requireViewer } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { AiSettingsPanel } from "@/components/ai-settings-panel";
import { aiConfiguration, modelBackedAiAvailable } from "@/lib/ai/configuration";
export default async function SettingsPage() {
  const [user,creator]=await Promise.all([requireViewer(),requireCreator()]);const client=await createClient();
  const[{data:stored},{data:usage}]=await Promise.all([client!.from("creator_ai_settings").select("*").eq("creator_id",creator.id).maybeSingle(),client!.rpc("get_ai_usage_summary")]);
  const defaults={enabled:false,preferred_model:aiConfiguration().model,preferred_variant:"standard",tone:"natural",audience_description:"",
  preferred_terminology:"",phrases_to_avoid:"",cta_style:"",custom_voice_instructions:"",include_emojis:false,include_hashtags:false,
  preserve_source_title:true,approval_required:true,ai_auto_send_enabled:false,ai_required:false,monthly_generation_limit:50,monthly_budget_minor_units:1000};
  return <><div className="mb-8"><p className="eyebrow">Workspace</p><h1 className="mt-2 text-3xl font-semibold">Settings</h1></div><div className="settings-grid"><section className="surface rounded-xl p-6"><h2 className="font-semibold">Account</h2><p className="mt-3 text-sm text-zinc-400">{user.email}</p></section><Link href="/dashboard/security" className="surface settings-security-card"><span><ShieldCheck size={20}/></span><div><h2>Security</h2><p>Manage two-factor authentication and your active session.</p></div><ArrowRight size={17}/></Link></div>
  <AiSettingsPanel settings={stored??defaults} usage={usage as Record<string,unknown>|null} configured={modelBackedAiAvailable()}/>
  <section className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-6"><h2 className="font-semibold text-red-200">Delete account</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Account deletion is intentionally unavailable until the required confirmation-email job and recent-authentication enforcement are configured. Contact support to initiate a verified deletion request.</p><Link href="/contact" className="button button-secondary mt-5 text-sm">Contact support</Link></section></>;
}
