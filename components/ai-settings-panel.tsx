import{Sparkles}from"lucide-react";import{saveAiSettings}from"@/app/dashboard/settings/ai-actions";
type Settings={enabled:boolean;preferred_model:string;preferred_variant:string;tone:string;audience_description:string;preferred_terminology:string;
phrases_to_avoid:string;cta_style:string;custom_voice_instructions:string;include_emojis:boolean;include_hashtags:boolean;preserve_source_title:boolean;
approval_required:boolean;ai_auto_send_enabled:boolean;ai_required:boolean;monthly_generation_limit:number;monthly_budget_minor_units:number};
export function AiSettingsPanel({settings,usage,configured}:{settings:Settings;usage:Record<string,unknown>|null;configured:boolean}){
return<section className="surface mt-6 rounded-xl p-6"><div className="flex items-start gap-3"><Sparkles className="text-violet-300"/><div><h2 className="font-semibold">AI-assisted drafts</h2>
<p className="mt-1 text-sm text-zinc-400">Optional structured enhancements. Deterministic drafts always remain available.</p></div></div>
<p className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-zinc-400">Model provider: OpenAI · {configured?"Configured":"No model key configured — deterministic fallback only"}
 · This month: {String(usage?.jobs_completed??0)} completions / {String(usage?.estimated_cost_minor_units??0)} minor units estimated.</p>
<form action={saveAiSettings} className="mt-5 grid gap-4"><label className="flex gap-3"><input type="checkbox" name="enabled" defaultChecked={settings.enabled}/><span><strong>Enable AI enhancement</strong><small className="block text-zinc-500">Off by default.</small></span></label>
<div className="grid gap-4 sm:grid-cols-2"><label className="label">Preferred variant<select name="preferred_variant" defaultValue={settings.preferred_variant}>{["standard","concise","detailed","email","browser","sms","recovery"].map(x=><option key={x}>{x}</option>)}</select></label>
<label className="label">Tone<select name="tone" defaultValue={settings.tone}>{["natural","energetic","professional","conversational","concise","educational"].map(x=><option key={x}>{x}</option>)}</select></label></div>
<input type="hidden" name="preferred_model" value={settings.preferred_model}/><label className="label">Audience description<textarea name="audience_description" maxLength={500} defaultValue={settings.audience_description}/></label>
<label className="label">Preferred terminology<textarea name="preferred_terminology" maxLength={500} defaultValue={settings.preferred_terminology}/></label>
<label className="label">Words or phrases to avoid<textarea name="phrases_to_avoid" maxLength={500} defaultValue={settings.phrases_to_avoid}/></label>
<label className="label">Call-to-action style<input name="cta_style" maxLength={300} defaultValue={settings.cta_style}/></label>
<label className="label">Custom voice instructions<textarea name="custom_voice_instructions" maxLength={1500} defaultValue={settings.custom_voice_instructions}/></label>
<div className="grid gap-2 text-sm sm:grid-cols-2">{[["include_emojis","Allow emojis",settings.include_emojis],["include_hashtags","Allow hashtags",settings.include_hashtags],
["preserve_source_title","Preserve source title",settings.preserve_source_title],["approval_required","Require approval",settings.approval_required],
["ai_auto_send_enabled","Permit AI-enhanced auto-send",settings.ai_auto_send_enabled],["ai_required","Require AI before auto-send",settings.ai_required]].map(([name,label,checked])=>
<label key={String(name)} className="flex gap-2"><input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)}/>{String(label)}</label>)}</div>
<div className="grid gap-4 sm:grid-cols-2"><label className="label">Monthly generations<input type="number" name="monthly_generation_limit" min="0" max="10000" defaultValue={settings.monthly_generation_limit}/></label>
<label className="label">Monthly budget (minor units)<input type="number" name="monthly_budget_minor_units" min="0" max="10000000" defaultValue={settings.monthly_budget_minor_units}/></label></div>
<button className="button button-primary w-fit" type="submit">Save AI settings</button></form></section>}
