"use client";
import{useState}from"react";import{Copy,Sparkles,TriangleAlert}from"lucide-react";import{cancelEnhancement,enhanceDraft,restoreOriginal,selectDraftVariant}from"@/app/dashboard/updates/ai-actions";
type Job={id:string;status:string;prompt_version:string;stale_result:boolean;last_error_code:string|null};
type Variant={id:string;variant_type:string;title:string;body:string;provider:string;model:string;prompt_version:string;selected:boolean};
export function AiDraftPanel({updateId,status,original,jobs,variants}:{updateId:string;status:string;original:{title:string|null;body:string|null};jobs:Job[];variants:Variant[]}){
const[copied,setCopied]=useState<string|null>(null);if(status!=="draft"&&!variants.length)return null;const latest=jobs[0];
async function copyVariant(variant:Variant){await navigator.clipboard.writeText(`${variant.title}\n\n${variant.body}`);setCopied(variant.id);setTimeout(()=>setCopied(null),1500);}
return<section className="surface mb-6 rounded-xl p-5"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">AI-assisted draft</p>
<h2 className="mt-2 flex items-center gap-2 text-lg font-semibold"><Sparkles size={17}/>Compare announcement variants</h2><p className="mt-1 text-sm text-zinc-400">Generation runs only when requested. Manual edits are never overwritten by a late result.</p></div>
{latest&&<span className="rounded-full bg-white/5 px-3 py-1 text-xs">{latest.status}</span>}</div>
{latest?.stale_result&&<p className="mt-4 flex gap-2 rounded-lg bg-amber-400/5 p-3 text-xs text-amber-200"><TriangleAlert size={14}/>Generated after a manual edit; not applied automatically.</p>}
<div className="mt-4 flex flex-wrap gap-2"><form action={enhanceDraft.bind(null,updateId)}><button className="button button-secondary" type="submit">{latest?"Regenerate":"Enhance draft"}</button></form>
{latest&&["pending","processing","retryable_failure"].includes(latest.status)&&<form action={cancelEnhancement.bind(null,updateId)}><button className="button button-secondary" type="submit">Cancel</button></form>}
{original.title&&<form action={restoreOriginal.bind(null,updateId)}><button className="button button-secondary" type="submit">Use original</button></form>}</div>
{variants.length>0&&<div className="mt-5 grid gap-3 lg:grid-cols-2">{variants.map(v=><article className={`rounded-xl border p-4 ${v.selected?"border-violet-400/60":"border-white/10"}`} key={v.id}>
<div className="flex justify-between gap-2"><strong className="capitalize">{v.variant_type}</strong><span className="text-xs text-zinc-500">{v.provider} · {v.model}</span></div><h3 className="mt-3 font-medium">{v.title}</h3>
<p className="mt-2 whitespace-pre-line text-sm text-zinc-400">{v.body}</p><div className="mt-4 flex flex-wrap gap-2"><form action={selectDraftVariant.bind(null,updateId)}><input type="hidden" name="variant_id" value={v.id}/>
<button className="button button-secondary" type="submit">{v.selected?"Selected":"Use this variant"}</button></form>
<button className="button button-secondary" type="button" onClick={()=>void copyVariant(v)}><Copy size={14}/>{copied===v.id?"Copied":"Copy"}</button></div></article>)}</div>}</section>}
