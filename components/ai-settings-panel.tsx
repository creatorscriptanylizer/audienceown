import{Check,Save,Sparkles}from"lucide-react";import{saveAiSettings}from"@/app/dashboard/settings/ai-actions";
type Settings={enabled:boolean;preferred_model:string;preferred_variant:string;tone:string;audience_description:string;preferred_terminology:string;
phrases_to_avoid:string;cta_style:string;custom_voice_instructions:string;include_emojis:boolean;include_hashtags:boolean;preserve_source_title:boolean;
approval_required:boolean;ai_auto_send_enabled:boolean;ai_required:boolean;monthly_generation_limit:number;monthly_budget_minor_units:number};
export function AiSettingsPanel({settings,usage,configured,usageAvailable=true}:{settings:Settings;usage:Record<string,unknown>|null;configured:boolean;usageAvailable?:boolean}){
return<section className="settings-ai-card"><div className="settings-ai-heading"><span><Sparkles aria-hidden/></span><div><p className="eyebrow">Draft intelligence</p><h2>AI-assisted drafts</h2>
<p className="mt-1 text-sm text-zinc-400">Optional structured enhancements. Deterministic drafts always remain available.</p></div></div>
<div className="settings-ai-status"><span>Provider <strong>OpenAI</strong></span><span data-state={configured?"ready":"fallback"}>{configured?"Configured":"No model key configured"}</span><span>{configured?"Model-assisted drafting":"Deterministic fallback only"}</span><span>{usageAvailable?<>This month: <strong>{String(usage?.jobs_completed??0)}</strong> completions / <strong>{String(usage?.estimated_cost_minor_units??0)}</strong> minor units</>:"Usage temporarily unavailable"}</span></div>
<form action={saveAiSettings} className="settings-ai-form"><label className="settings-enable-row"><input type="checkbox" name="enabled" defaultChecked={settings.enabled}/><span className="settings-checkbox"><Check aria-hidden/></span><span><strong>Enable AI enhancement</strong><small>Off by default.</small></span></label>
<div className="grid gap-4 sm:grid-cols-2"><label className="label">Preferred variant<select name="preferred_variant" defaultValue={settings.preferred_variant}>{["standard","concise","detailed","email","browser","sms","recovery"].map(x=><option key={x}>{x}</option>)}</select></label>
<label className="label">Tone<select name="tone" defaultValue={settings.tone}>{["natural","energetic","professional","conversational","concise","educational"].map(x=><option key={x}>{x}</option>)}</select></label></div>
<input type="hidden" name="preferred_model" value={settings.preferred_model}/><label className="label">Audience description<textarea name="audience_description" maxLength={500} defaultValue={settings.audience_description}/></label>
<label className="label">Preferred terminology<textarea name="preferred_terminology" maxLength={500} defaultValue={settings.preferred_terminology}/></label>
<label className="label">Words or phrases to avoid<textarea name="phrases_to_avoid" maxLength={500} defaultValue={settings.phrases_to_avoid}/></label>
<label className="label">Call-to-action style<input name="cta_style" maxLength={300} defaultValue={settings.cta_style}/></label>
<label className="label">Custom voice instructions<textarea name="custom_voice_instructions" maxLength={1500} defaultValue={settings.custom_voice_instructions}/></label>
<div className="settings-checkbox-grid">{[["include_emojis","Allow emojis",settings.include_emojis],["include_hashtags","Allow hashtags",settings.include_hashtags],
["preserve_source_title","Preserve source title",settings.preserve_source_title],["approval_required","Require approval",settings.approval_required],
["ai_auto_send_enabled","Permit AI-enhanced auto-send",settings.ai_auto_send_enabled],["ai_required","Require AI before auto-send",settings.ai_required]].map(([name,label,checked])=>
<label key={String(name)}><input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)}/><span className="settings-checkbox"><Check aria-hidden/></span><span>{String(label)}</span></label>)}</div>
<div className="grid gap-4 sm:grid-cols-2"><label className="label">Monthly generations<input type="number" name="monthly_generation_limit" min="0" max="10000" defaultValue={settings.monthly_generation_limit}/></label>
<label className="label">Monthly budget (minor units)<input type="number" name="monthly_budget_minor_units" min="0" max="10000000" defaultValue={settings.monthly_budget_minor_units}/></label></div>
<button className="button button-primary settings-ai-save" type="submit"><Save aria-hidden/>Save AI settings</button></form></section>}
