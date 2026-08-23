"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Circle, History, LifeBuoy, Radio, ShieldAlert, TriangleAlert } from "lucide-react";
import { PreparednessCenter } from "@/components/emergency/preparedness-center";
import { UnavailableState } from "@/components/product-state";
import type { RecoveryReadiness, RecoveryReadinessCheckStatus } from "@/lib/recovery-readiness";
import { CREATE_EMERGENCY_ENTRY_ROUTE } from "@/lib/dashboard-routes";

type EmergencyItem={id:string;emergency_type:string;lifecycle_status:string;severity:string;title:string;message:string;updated_at:string;
emergency_affected_accounts:{display_handle:string;provider:string}[];emergency_replacement_accounts:{id:string;display_handle:string;provider:string;canonical_profile_url:string;stable_provider_account_id:string;verification_state:string;verification_method:string|null;verification_confidence:string|null;official:boolean;verified_at:string|null;last_revalidated_at:string|null;next_revalidation_at:string|null;revalidation_status:string}[];
emergency_events:{id:number;event_type:string;created_at:string}[];creator_update_id:string|null};
type Account={id:string;platform:string;label:string;url:string;external_account_id?:string|null;connection_health?:string;provider_status?:string};
type Delivery={update_id:string;status:string;transport:string};
type PreparednessProps=React.ComponentProps<typeof PreparednessCenter>;

function ReadinessItem({ label, status }: { label: string; status: RecoveryReadinessCheckStatus }) {
  const complete=status==="complete",unavailable=status==="unavailable";
  return <li className={complete ? "is-complete" : unavailable ? "is-unavailable" : "is-incomplete"}>
    <span>{complete ? <Check size={15}/> : <Circle size={15}/>}</span>
    <strong>{label}</strong>
    <small>{complete ? "Ready" : unavailable ? "Unavailable" : "Not configured"}</small>
  </li>;
}

export function EmergencyWorkspace({ readiness,primaryDestinationLabel=null,availability={accounts:true,emergencies:true,deliveries:true,preparedness:true},accounts=[],emergencies=[],deliveries=[],templates=[],plans=[],drills=[] }: { readiness: RecoveryReadiness;primaryDestinationLabel?:string|null;availability?:{accounts:boolean;emergencies:boolean;deliveries:boolean;preparedness:boolean};accounts?:Account[];emergencies?:EmergencyItem[];deliveries?:Delivery[];templates?:PreparednessProps["templates"];plans?:PreparednessProps["plans"];drills?:PreparednessProps["drills"] }) {
  const[message,setMessage]=useState<string|null>(null),[busy,setBusy]=useState(false);
  async function request(path:string,body?:unknown){setBusy(true);setMessage(null);try{const response=await fetch(path,{method:"POST",headers:body?{"content-type":"application/json"}:undefined,
  body:body?JSON.stringify(body):undefined});const result=await response.json()as{error?:string};if(!response.ok)throw new Error(result.error??"Request failed");
  setMessage("Emergency record updated.");window.location.reload();}catch(error){setMessage(error instanceof Error?error.message:"Request failed");}finally{setBusy(false);}}
  async function createIncident(form:FormData){await request("/api/emergencies",{emergency_type:String(form.get("emergency_type")),severity:String(form.get("severity")),
  title:String(form.get("title")),message:String(form.get("message")),affected_account_id:String(form.get("affected_account_id"))});}
  async function activateIncident(id:string,severity:string){if(severity!=="critical")return request(`/api/emergencies/${id}/activate`);setBusy(true);setMessage(null);try{const started=await fetch(`/api/emergencies/${id}/authorization/start`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({purpose:"activate_critical_incident"})});const session=await started.json()as{id?:string;challenge?:string;error?:string};if(!started.ok||!session.id||!session.challenge)throw new Error(session.error??"Strong authorization could not be started");const completed=await fetch(`/api/emergencies/${id}/authorization/complete`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session_id:session.id,challenge:session.challenge})});const completion=await completed.json()as{error?:string};if(!completed.ok)throw new Error(completion.error??"Strong authorization could not be completed");const activated=await fetch(`/api/emergencies/${id}/activate`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({authorization_session_id:session.id})});const result=await activated.json()as{error?:string};if(!activated.ok)throw new Error(result.error??"Activation blocked");window.location.reload();}catch(error){setMessage(error instanceof Error?error.message:"Activation blocked");}finally{setBusy(false);}}
  return <div className="emergency-page">
    <header className="emergency-header">
      <p className="eyebrow">Recovery control</p>
      <h1>Emergency</h1>
      <p>Prepare and manage the route your audience can use if a platform account is hacked, suspended, deleted, or no longer accessible.</p>
    </header>

    {availability.preparedness ? <PreparednessCenter accounts={accounts} templates={templates} plans={plans} drills={drills}/> : <UnavailableState className="mb-6" compact title="Preparedness unavailable" description="Emergency plans, templates, or drills could not be loaded."/>}

    <section className="surface mb-6 rounded-xl p-5">
      <p className="eyebrow">Emergency Center</p><h2 className="mt-2 text-xl font-semibold">Create a verified incident</h2>
      <p className="mt-1 text-sm text-zinc-400">Alerts remain drafts until verification and approval gates are satisfied. Critical alerts require a separate approver and recent reauthentication.</p>
      <form action={createIncident} className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="field-label">Emergency type<select name="emergency_type" required defaultValue="account_hacked"><option value="account_hacked">Account hacked</option><option value="account_banned">Account banned</option>
        <option value="account_suspended">Account suspended</option><option value="account_changed">Account changed</option><option value="fake_account_warning">Fake account warning</option>
        <option value="scam_warning">Scam warning</option><option value="other">Other</option></select></label>
        <label className="field-label">Severity<select name="severity" required defaultValue="important"><option value="informational">Informational</option><option value="important">Important</option><option value="critical">Critical</option></select></label>
        <label className="field-label">Affected official account<select name="affected_account_id" required defaultValue=""><option value="" disabled>Select account</option>{accounts.map(a=><option value={a.id} key={a.id}>{a.platform} · {a.label}</option>)}</select></label>
        <label className="field-label">Alert title<input name="title" required maxLength={160}/></label>
        <label className="field-label md:col-span-2">Verified public message<textarea name="message" required maxLength={5000} rows={4}/></label>
        <button className="button button-primary w-fit" disabled={busy||!accounts.length||!availability.accounts}>Create incident</button>
      </form>{message&&<p className="mt-3 text-sm text-zinc-300" role="status">{message}</p>}
    </section>

    {!availability.emergencies ? <UnavailableState className="mb-6" compact title="Emergency status unavailable" description="Current incidents and lifecycle status could not be loaded."/> : emergencies.length===0 ? <section className="surface mb-6 rounded-xl p-5"><h2 className="font-semibold">No active emergency</h2><p className="mt-1 text-sm text-zinc-400">No emergency records are currently active or awaiting action.</p></section> : <section className="mb-6 space-y-4"><div><p className="eyebrow">Incident history</p><h2 className="mt-2 text-xl font-semibold">Emergency alerts</h2></div>
    {emergencies.map(e=><article className="surface rounded-xl p-5" key={e.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex gap-2 text-xs uppercase tracking-wide text-zinc-400">
    <span>{e.severity}</span><span>·</span><span>{e.lifecycle_status.replaceAll("_"," ")}</span></div><h3 className="mt-2 text-lg font-semibold">{e.title}</h3>
    <p className="mt-2 max-w-3xl whitespace-pre-line text-sm text-zinc-300">{e.message}</p></div><span className="text-xs text-zinc-500">Updated {new Date(e.updated_at).toLocaleString()}</span></div>
    <div className="mt-4 flex flex-wrap gap-2">{["draft","pending_verification"].includes(e.lifecycle_status)&&<button className="button button-secondary" disabled={busy} onClick={()=>request(`/api/emergencies/${e.id}/submit`)}>Submit for approval</button>}
    {e.lifecycle_status==="pending_approval"&&<button className="button button-secondary" disabled={busy} onClick={()=>request(`/api/emergencies/${e.id}/approve`,{})}>Approve</button>}
    {e.lifecycle_status==="ready"&&<button className="button button-primary" disabled={busy} onClick={()=>activateIncident(e.id,e.severity)}>Activate and notify Recovery Pass holders</button>}
    {e.lifecycle_status==="active"&&<button className="button button-secondary" disabled={busy} onClick={()=>request(`/api/emergencies/${e.id}/resolve`)}>Resolve</button>}
    {["draft","pending_verification","pending_approval","ready"].includes(e.lifecycle_status)&&<button className="button button-secondary" disabled={busy} onClick={()=>request(`/api/emergencies/${e.id}/cancel`)}>Cancel</button>}</div>
    {["draft","pending_verification","pending_approval","ready"].includes(e.lifecycle_status)&&<form action={async(form)=>request(`/api/emergencies/${e.id}/replacements`,{provider:String(form.get("provider")),
    stable_provider_account_id:String(form.get("stable_provider_account_id")),display_handle:String(form.get("display_handle")),canonical_profile_url:String(form.get("canonical_profile_url"))})} className="mt-5 grid gap-2 border-t border-white/10 pt-4 md:grid-cols-3">
    <input name="provider" placeholder="Provider" required/><input name="stable_provider_account_id" placeholder="Stable provider account ID" required/>
    <input name="display_handle" placeholder="@official-backup" required/><input name="canonical_profile_url" type="url" placeholder="https://…" required/>
    <button className="button button-secondary" disabled={busy}>Prepare backup account</button></form>}
    <div className="mt-4 grid gap-3 md:grid-cols-3"><div><strong className="text-xs uppercase text-zinc-500">Affected</strong>{e.emergency_affected_accounts.map(a=><p className="mt-1 text-sm" key={`${a.provider}-${a.display_handle}`}>{a.provider} · {a.display_handle}</p>)}</div>
    <div><strong className="text-xs uppercase text-zinc-500">Verified replacement</strong>{e.emergency_replacement_accounts.length?e.emergency_replacement_accounts.map(r=><p className="mt-1 text-sm" key={`${r.provider}-${r.display_handle}`}>
    {r.display_handle} · {r.verification_state}{r.verification_confidence?` · ${r.verification_confidence} confidence`:""}{r.official?" · official":""}</p>):<p className="mt-1 text-sm text-zinc-500">None</p>}</div>
    <div><strong className="flex items-center gap-1 text-xs uppercase text-zinc-500"><History size={13}/>History and delivery</strong>
    {e.emergency_events.slice(-3).reverse().map(event=><p className="mt-1 text-sm" key={event.id}>{event.event_type.replaceAll("_"," ")} · {new Date(event.created_at).toLocaleString()}</p>)}
    {!availability.deliveries?<p className="mt-1 text-sm text-zinc-500">Delivery history unavailable</p>:e.creator_update_id?(deliveries.some(d=>d.update_id===e.creator_update_id)?deliveries.filter(d=>d.update_id===e.creator_update_id).slice(0,5).map((d,index)=><p className="text-sm text-zinc-400" key={`${d.transport}-${index}`}>{d.transport} · {d.status}</p>):<p className="mt-1 text-sm text-zinc-500">No delivery activity yet</p>)
    :<p className="mt-1 text-sm text-zinc-500">Not activated</p>}</div></div>
    <div className="mt-5 border-t border-white/10 pt-4"><strong className="text-xs uppercase text-zinc-500">Verified Backup Accounts</strong>{e.emergency_replacement_accounts.map(r=><div className="mt-3 rounded-lg border border-white/10 p-3" key={r.id}><p className="text-sm font-medium">{r.provider} · {r.display_handle}</p><p className="mt-1 text-xs text-zinc-400">{r.verification_method??"Not verified"} · {r.verification_confidence??"no confidence"} · health: {r.revalidation_status}</p>
    {r.verification_state==="verified"?<button className="button button-secondary mt-2" disabled={busy} onClick={()=>request(`/api/emergencies/${e.id}/replacements/${r.id}/revoke`)}>Revoke verification</button>:<div className="mt-2 flex flex-wrap gap-2">{accounts.filter(a=>a.platform===r.provider&&a.external_account_id&&["healthy","degraded"].includes(a.connection_health??"")).map(a=><button type="button" className="button button-secondary" disabled={busy} key={a.id} onClick={()=>request(`/api/emergencies/${e.id}/replacements/from-connection`,{replacement_id:r.id,connection_id:a.id})}>Verify with {a.label}</button>)}{!accounts.some(a=>a.platform===r.provider&&a.external_account_id)&&<span className="text-xs text-zinc-500">Provider verification unavailable until a healthy account is connected.</span>}</div>}</div>)}</div>
    {e.severity==="critical"&&<div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3"><strong className="text-sm">Critical activation checklist</strong><ul className="mt-2 space-y-1 text-xs text-zinc-300"><li>✓ Replacement account verified</li><li>✓ High-confidence verification required</li><li>✓ Separate approver required</li><li>✓ Current content approval required</li><li>✓ Strong reauthentication required</li><li>✓ Immutable snapshot and delivery readiness checked at activation</li></ul></div>}
    </article>)}</section>}

    <section className="emergency-readiness">
      <div className="emergency-readiness-copy">
        <span className="emergency-icon"><LifeBuoy size={22}/></span>
        <p className="eyebrow">Recovery setup</p>
        <h2>{readiness.score===null?"Readiness unavailable":`${readiness.score}% · ${readiness.state}`}</h2>
        <p>Configuration completion uses the same five required checks shown on your Dashboard. Prepared-plan state and incident lifecycle remain separate below.</p>
      </div>
      <ul>
        {readiness.checklist.map(item=><ReadinessItem key={item.key} label={item.label} status={item.status}/>)}
      </ul>
    </section>

    <div className="emergency-grid">
      <section className="emergency-broadcast-panel">
        <span className="emergency-panel-icon"><ShieldAlert size={21}/></span>
        <p className="eyebrow">Emergency broadcast</p>
        <h2>Send an important account update</h2>
        <p>Notify Recovery Pass holders about a hacked account, deleted channel, platform move, or another critical access change.</p>
        <div className="emergency-warning"><TriangleAlert size={16}/><span>Important account updates are reserved for critical access, recovery, and platform migration notices.</span></div>
        <Link prefetch={false} href={CREATE_EMERGENCY_ENTRY_ROUTE} className="button button-primary">Create emergency update <ArrowRight size={15}/></Link>
      </section>

      <section className="emergency-routing-panel">
        <span className="emergency-panel-icon"><Radio size={21}/></span>
        <p className="eyebrow">Recovery routing</p>
        <h2>Current destination</h2>
        {!availability.accounts ? <p className="emergency-destination is-empty">Status unavailable</p> : primaryDestinationLabel
          ? <p className="emergency-destination">{primaryDestinationLabel}</p>
          : <><p className="emergency-destination is-empty">Not configured</p><p>Recovery routing setup is coming next.</p></>}
        <Link href="/dashboard/platforms" className="button button-secondary">Manage platforms <ArrowRight size={15}/></Link>
      </section>
    </div>

    <section className="emergency-checklist">
      <div><p className="eyebrow">Recovery setup checklist</p><h2>Required configuration</h2></div>
      <ul>
        {readiness.checklist.map(item=><ReadinessItem key={item.key} label={item.label} status={item.status}/>)}
      </ul>
    </section>
  </div>;
}
