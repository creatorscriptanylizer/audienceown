import Link from "next/link";
import { Download, Mail, ShieldCheck } from "lucide-react";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { recoveryPassUrl, sourceLabel, type SourcePlatform } from "@/lib/recovery-pass";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EmptyState, ErrorState } from "@/components/product-state";
import { appUrl } from "@/lib/app-url";
import { logPageQueryFailure } from "@/lib/data-availability";

export default async function Page() {
  const creator=await requireCreator(),s=(await createClient())!;
  const publicSlug = creator.public_slug ?? "";
  const {data:connections,error:connectionsError}=await s.from("follower_connections")
    .select("id,follower_contact_id,status,activated_at,consented_at,source_platform")
    .eq("creator_id",creator.id).order("activated_at",{ascending:false});
  const rows=connections??[],active=rows.filter(r=>r.status==="active");
  const ids=active.map(r=>r.id),contactIds=active.map(r=>r.follower_contact_id);
  const [prefsResult,methodsResult,categoryPrefsResult]=await Promise.all([
    ids.length?s.from("follower_notification_preferences").select("follower_connection_id,important_account_updates,new_content,creator_announcements").in("follower_connection_id",ids):Promise.resolve({data:[],error:null}),
    contactIds.length?s.from("follower_recovery_methods").select("follower_contact_id,method_type,method_status,destination_masked").in("follower_contact_id",contactIds):Promise.resolve({data:[],error:null}),
    ids.length?s.from("follower_category_preferences").select("follower_connection_id,category_key,enabled").in("follower_connection_id",ids):Promise.resolve({data:[],error:null}),
  ]);
  logPageQueryFailure("audience","notification_preferences",prefsResult.error);
  logPageQueryFailure("audience","recovery_methods",methodsResult.error);
  logPageQueryFailure("audience","category_preferences",categoryPrefsResult.error);
  const {data:prefs}=prefsResult,{data:methods}=methodsResult,{data:categoryPrefs}=categoryPrefsResult;
  const methodsAvailable=!methodsResult.error,preferencesAvailable=!prefsResult.error&&!categoryPrefsResult.error;
  const methodRows=methods??[],prefRows=prefs??[],categoryRows=categoryPrefs??[];
  const sourceCounts=new Map<string,number>();
  active.forEach(row=>sourceCounts.set(row.source_platform??"direct",(sourceCounts.get(row.source_platform??"direct")??0)+1));
  const origins=appUrl();
  const sources=["tiktok","instagram","youtube","x","website"] as SourcePlatform[];
  const prefsById=new Map(prefRows.map(p=>[p.follower_connection_id,p]));
  const methodsByContact=new Map<string,typeof methodRows>();
  methodRows.forEach(m=>methodsByContact.set(m.follower_contact_id,[...(methodsByContact.get(m.follower_contact_id)??[]),m]));
  const countPref=(key:"important_account_updates"|"new_content"|"creator_announcements")=>prefRows.filter(p=>p[key]).length;
  const countCategory=(key:string)=>categoryRows.filter(p=>p.category_key===key&&p.enabled).length;
  const categoriesByConnection=new Map<string,string[]>();
  categoryRows.filter(row=>row.enabled).forEach(row=>categoriesByConnection.set(row.follower_connection_id,[...(categoriesByConnection.get(row.follower_connection_id)??[]),row.category_key]));
  return <div>
    <div className="audience-header"><div><p className="eyebrow">Protected audience</p><h1>Audience</h1><p>Everyone who has protected their connection with you.</p></div><div className="flex flex-wrap gap-3"><CopyLinkButton value={recoveryPassUrl(origins,publicSlug)} label="Copy Recovery Pass link"/><Link href="/api/audience/export" className="button button-secondary"><Download size={15}/>Export protected audience</Link></div></div>
    {connectionsError?<ErrorState className="mt-8" title="Protected audience unavailable" description="We could not load your Recovery Pass activity right now. Your saved audience was not changed." primaryAction={{label:"Reload",href:"/dashboard/audience"}}/>:active.length===0?<EmptyState className="mt-8" icon={ShieldCheck} title="No fans have joined your Recovery Pass yet" description="Share your Recovery Pass link from a platform bio. New protected fans and their alert preferences will appear here." primaryAction={{label:"Open Creator page",href:`/c/${creator.public_slug}`}} secondaryAction={{label:"Manage platforms",href:"/dashboard/platforms"}}/>:<>
      <section className="audience-metrics"><article><span>Protected fans</span><strong>{active.length}</strong><small>People who can always find you.</small></article><article><span>Email enabled</span><strong>{methodsAvailable?methodRows.filter(m=>m.method_type==="email"&&m.method_status==="verified").length:"—"}</strong><small>{methodsAvailable?"Verified alert delivery method.":"Notification methods unavailable"}</small></article><article><span>Recovery alerts</span><strong>{preferencesAvailable?(categoryRows.length?countCategory("recovery"):countPref("important_account_updates")):"—"}</strong><small>{preferencesAvailable?"Core recovery coverage.":"Preferences unavailable"}</small></article></section>
      <div className="audience-breakdowns">
        <section className="surface audience-panel"><h2>Where fans found you</h2>{[...sourceCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([source,count])=><div className="breakdown-row" key={source}><div><span>{sourceLabel(source)}</span><b>{count} · {Math.round(count/active.length*100)}%</b></div><i><span style={{width:`${count/active.length*100}%`}}/></i></div>)}</section>
        <section className="surface audience-panel"><h2>What fans want to hear about</h2>{preferencesAvailable?[["Recovery alerts",categoryRows.length?countCategory("recovery"):countPref("important_account_updates")],["New videos",categoryRows.length?countCategory("videos"):countPref("new_content")],["Live streams",countCategory("livestreams")],["Announcements",categoryRows.length?countCategory("announcements"):countPref("creator_announcements")],["Official products",countCategory("products")]].map(([label,count])=><div className="preference-count" key={String(label)}><span>{label}</span><strong>{count} <small>of {active.length}</small></strong></div>):<p className="mt-3 text-sm text-zinc-400">Preferences unavailable</p>}</section>
      </div>
      <section className="surface share-links"><h2>Share your Recovery Pass</h2><p>First-touch source attribution is saved when a fan activates their pass.</p><div>{sources.map(source=><CopyLinkButton key={source} value={recoveryPassUrl(origins,publicSlug,source)} label={`Copy ${sourceLabel(source)} link`}/>)}</div></section>
      <section className="surface audience-list"><h2>Protected fans</h2><div role="region" aria-label="Protected fans table" tabIndex={0} className="overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"><table><thead><tr><th>Protected</th><th>Source</th><th>Recovery methods</th><th>Alerts</th><th>Status</th></tr></thead><tbody>{rows.map(row=>{const ms=methodsByContact.get(row.follower_contact_id)??[],p=prefsById.get(row.id),categories=categoriesByConnection.get(row.id);return <tr key={row.id}><td>{formatDate(row.activated_at??row.consented_at)}</td><td>{sourceLabel(row.source_platform)}</td><td>{!methodsAvailable?"Unavailable":ms.length?ms.map(m=><span className="method-pill" key={`${m.method_type}-${m.destination_masked}`}><Mail size={12}/>{m.destination_masked??m.method_type}</span>):"—"}</td><td>{!preferencesAvailable?"Unavailable":categories?.map(key=>({recovery:"Recovery",videos:"Videos",livestreams:"Live streams",announcements:"Announcements",products:"Products"}[key]??key)).join(", ")||[p?.important_account_updates&&"Recovery",p?.new_content&&"Videos",p?.creator_announcements&&"Announcements"].filter(Boolean).join(", ")||"None"}</td><td><span className={`status-${row.status==="active"?"live":"draft"}`}>{row.status==="active"?"Active":"Deactivated"}</span></td></tr>})}</tbody></table></div></section>
    </>}
  </div>;
}
