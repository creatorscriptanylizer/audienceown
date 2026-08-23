import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createTraceId, debugStep } from "@/lib/debug";

export const AUDIENCE_FILTERS = ["all","main","recovery","videos","livestreams","podcast","products","announcements","email","sms","needs-verification"] as const;
export const AUDIENCE_DASHBOARD_LOADER_VERSION = "audience-dashboard-v3";
export type AudienceFilter = typeof AUDIENCE_FILTERS[number];
export type AudienceRange = "30d"|"90d"|"12m";
export type AudienceDashboardOptions = {page:number;pageSize:number;query:string;filter:AudienceFilter;range:AudienceRange;now?:Date;privateMatchPersonIds?:ReadonlySet<string>};

type Connection={id:string;follower_contact_id:string;status:string;activated_at:string|null;consented_at:string;deactivated_at:string|null;unsubscribed_at:string|null;source_platform:string};
type Method={follower_contact_id:string;method_type:string;method_status:string;destination_masked:string|null;consent_revoked_at:string|null;opted_out_at:string|null};
type Category={follower_connection_id:string;category_key:string;enabled:boolean};
type LegacyPref={follower_connection_id:string;new_content:boolean;creator_announcements:boolean;important_account_updates:boolean};
type Membership={follower_connection_id:string;connected_account_id:string};
type Account={id:string;platform:string;account_type:string;label:string;external_account_name:string|null};

export type AudienceDashboardData=Awaited<ReturnType<typeof getAudienceDashboardData>>;

const percent=(value:number,total:number)=>total?Math.round(value/total*100):0;
const activeMethod=(m:Method)=>m.method_status==="verified"&&!m.consent_revoked_at&&!m.opted_out_at;
const monthKey=(date:Date)=>date.toISOString().slice(0,7);
const dayKey=(date:Date)=>date.toISOString().slice(0,10);

/** Active protected audience: unique follower_contact_id with at least one canonical follower_connection in status=active. */
export function buildAudienceDashboard(rows:{connections:Connection[];methods:Method[];categories:Category[];legacyPreferences:LegacyPref[];memberships:Membership[];accounts:Account[]},options:AudienceDashboardOptions){
  const now=options.now??new Date(), activeConnections=rows.connections.filter(row=>row.status==="active");
  const byPerson=new Map<string,Connection[]>();
  for(const connection of activeConnections)byPerson.set(connection.follower_contact_id,[...(byPerson.get(connection.follower_contact_id)??[]),connection]);
  const methodsByPerson=new Map<string,Method[]>();
  for(const method of rows.methods)methodsByPerson.set(method.follower_contact_id,[...(methodsByPerson.get(method.follower_contact_id)??[]),method]);
  const categoriesByConnection=new Map<string,Set<string>>();
  for(const item of rows.categories)if(item.enabled)categoriesByConnection.set(item.follower_connection_id,(categoriesByConnection.get(item.follower_connection_id)??new Set()).add(item.category_key));
  const legacyByConnection=new Map(rows.legacyPreferences.map(item=>[item.follower_connection_id,item]));
  const accountById=new Map(rows.accounts.map(account=>[account.id,account]));
  const membershipsByConnection=new Map<string,Account[]>();
  for(const membership of rows.memberships){const account=accountById.get(membership.connected_account_id);if(account)membershipsByConnection.set(membership.follower_connection_id,[...(membershipsByConnection.get(membership.follower_connection_id)??[]),account]);}
  const people=[...byPerson.entries()].map(([personId,connections])=>{
    const methods=methodsByPerson.get(personId)??[], email=methods.some(m=>m.method_type==="email"&&activeMethod(m)),sms=methods.some(m=>m.method_type==="sms"&&activeMethod(m));
    const preferenceKeys=new Set<string>(), accounts=new Map<string,Account>();
    for(const connection of connections){
      for(const key of categoriesByConnection.get(connection.id)??[])preferenceKeys.add(key);
      const legacy=legacyByConnection.get(connection.id);if(legacy?.new_content)preferenceKeys.add("videos");if(legacy?.creator_announcements)preferenceKeys.add("announcements");if(legacy?.important_account_updates)preferenceKeys.add("recovery");
      for(const account of membershipsByConnection.get(connection.id)??[])accounts.set(account.id,account);
    }
    const joined=connections.map(c=>c.activated_at??c.consented_at).sort()[0]!;
    const identity=methods.find(method=>activeMethod(method)&&method.method_type==="email")?.destination_masked
      ??methods.find(method=>activeMethod(method)&&method.method_type==="sms")?.destination_masked
      ??"Protected follower";
    return{personId,connections,methods,email,sms,reachable:email||sms,preferenceKeys,accounts:[...accounts.values()],joined,identity};
  });
  const total=people.length,currentMonth=monthKey(now),previous=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1)),previousMonth=monthKey(previous);
  const newThisMonth=people.filter(p=>monthKey(new Date(p.joined))===currentMonth).length,previousCount=people.filter(p=>monthKey(new Date(p.joined))===previousMonth).length;
  const preferenceDefs=[{key:"videos",label:"Video updates"},{key:"livestreams",label:"Livestreams"},{key:"podcast",label:"Podcast updates"},{key:"products",label:"Product updates"},{key:"announcements",label:"Announcements"}];
  const preferences=preferenceDefs.map(def=>{const followerCount=people.filter(p=>p.preferenceKeys.has(def.key)).length;return{...def,followerCount,percentage:percent(followerCount,total)}}).filter(item=>item.followerCount>0);
  const accountStats=rows.accounts.map(account=>{const members=people.filter(p=>p.accounts.some(a=>a.id===account.id));return{accountId:account.id,provider:account.platform,accountRole:account.account_type==="official"?"main" as const:"recovery" as const,displayName:account.external_account_name??account.label,protectedFollowerCount:members.length,newThisMonth:members.filter(p=>monthKey(new Date(p.joined))===currentMonth).length};}).filter(item=>item.protectedFollowerCount>0);
  const rangeDays=options.range==="30d"?30:options.range==="90d"?90:365,start=new Date(now);start.setUTCDate(start.getUTCDate()-rangeDays+1);start.setUTCHours(0,0,0,0);
  const growth=Array.from({length:rangeDays},(_,index)=>{const date=new Date(start);date.setUTCDate(date.getUTCDate()+index);const end=new Date(date);end.setUTCDate(end.getUTCDate()+1);const joined=rows.connections.filter(c=>{const d=new Date(c.activated_at??c.consented_at);return d>=date&&d<end;});const revoked=rows.connections.filter(c=>{const value=c.unsubscribed_at??c.deactivated_at;if(!value)return false;const d=new Date(value);return d>=date&&d<end;});const activeAudience=new Set(rows.connections.filter(c=>new Date(c.activated_at??c.consented_at)<end&&(!c.unsubscribed_at||new Date(c.unsubscribed_at)>=end)&&(!c.deactivated_at||new Date(c.deactivated_at)>=end)).map(c=>c.follower_contact_id)).size;return{date:dayKey(date),newJoins:new Set(joined.map(c=>c.follower_contact_id)).size,activeAudience,unsubscribes:new Set(revoked.map(c=>c.follower_contact_id)).size,netGrowth:new Set(joined.map(c=>c.follower_contact_id)).size-new Set(revoked.map(c=>c.follower_contact_id)).size};});
  const matches=(p:typeof people[number])=>{const q=options.query.toLocaleLowerCase(),visible=[p.identity,...p.accounts.flatMap(account=>[account.label,account.external_account_name??"",account.platform])].join(" ").toLocaleLowerCase();if(q&&!visible.includes(q)&&!options.privateMatchPersonIds?.has(p.personId))return false;switch(options.filter){case"main":return p.accounts.some(a=>a.account_type==="official");case"recovery":return p.accounts.some(a=>a.account_type!=="official");case"email":return p.email;case"sms":return p.sms;case"needs-verification":return!p.reachable;case"all":return true;default:return p.preferenceKeys.has(options.filter);}};
  const filtered=people.filter(matches).sort((a,b)=>b.joined.localeCompare(a.joined)),from=(options.page-1)*options.pageSize;
  return{summary:{protectedFollowers:total,reachableNow:people.filter(p=>p.reachable).length,newThisMonth,newThisMonthChange:previousCount?Math.round((newThisMonth-previousCount)/previousCount*100):null,reachabilityRate:percent(people.filter(p=>p.reachable).length,total)},sources:accountStats,preferences,deliveryHealth:{emailVerified:people.filter(p=>p.email).length,smsVerified:people.filter(p=>p.sms).length,bothVerified:people.filter(p=>p.email&&p.sms).length,needsVerification:people.filter(p=>!p.reachable).length,reachableUnique:people.filter(p=>p.reachable).length,reachablePercentage:percent(people.filter(p=>p.reachable).length,total)},growth,followers:{rows:filtered.slice(from,from+options.pageSize).map(p=>({id:p.personId,identity:p.identity,joined:p.joined,preferences:[...p.preferenceKeys],delivery:[p.email&&"Email",p.sms&&"SMS"].filter(Boolean)as string[],sources:p.accounts.map(a=>({id:a.id,provider:a.platform,name:a.external_account_name??a.label,role:a.account_type==="official"?"main":"recovery"}))})),total:filtered.length,page:options.page,pageSize:options.pageSize}};
}

export async function getAudienceDashboardData(db:SupabaseClient<Database>,creatorId:string,options:AudienceDashboardOptions){
  const traceId=createTraceId("audience");
  debugStep("database","audience.loader",{trace_id:traceId,route:"/dashboard/audience",loader_version:AUDIENCE_DASHBOARD_LOADER_VERSION}).success();
  const run=async<T>(stage:string,query:PromiseLike<{data:T[]|null;error:unknown}>)=>{
    const debug=debugStep("database",stage,{trace_id:traceId,route:"/dashboard/audience"});
    const result=await query;
    if(result.error){debug.failed(result.error);throw result.error;}
    debug.success({row_count:result.data?.length??0});
    return result;
  };
  const connectionsResult=await run<Connection>("audience.follower_connections",db.from("follower_connections").select("id,follower_contact_id,status,activated_at,consented_at,deactivated_at,unsubscribed_at,source_platform").eq("creator_id",creatorId));
  const connections=connectionsResult.data??[],connectionIds=connections.map(c=>c.id),contactIds=[...new Set(connections.map(c=>c.follower_contact_id))];
  const empty=<T,>()=>Promise.resolve({data:[] as T[],error:null});
  const [methods,categories,legacy,memberships,accounts]=await Promise.all([
    run<Method>("audience.follower_recovery_methods",contactIds.length?db.from("follower_recovery_methods").select("follower_contact_id,method_type,method_status,destination_masked,consent_revoked_at,opted_out_at").in("follower_contact_id",contactIds):empty<Method>()),
    run<Category>("audience.follower_category_preferences",connectionIds.length?db.from("follower_category_preferences").select("follower_connection_id,category_key,enabled").in("follower_connection_id",connectionIds):empty<Category>()),
    run<LegacyPref>("audience.follower_notification_preferences",connectionIds.length?db.from("follower_notification_preferences").select("follower_connection_id,new_content,creator_announcements,important_account_updates").in("follower_connection_id",connectionIds):empty<LegacyPref>()),
    run<Membership>("audience.follower_connection_account_memberships",connectionIds.length?db.from("follower_connection_account_memberships").select("follower_connection_id,connected_account_id").eq("creator_id",creatorId).in("follower_connection_id",connectionIds):empty<Membership>()),
    run<Account>("audience.connected_accounts",db.from("connected_accounts").select("id,platform,account_type,label,external_account_name").eq("creator_id",creatorId)),
  ]);
  const transform=debugStep("database","audience.model_transform",{trace_id:traceId,route:"/dashboard/audience"});
  try{const model=buildAudienceDashboard({connections,methods:methods.data??[],categories:categories.data??[],legacyPreferences:legacy.data??[],memberships:memberships.data??[],accounts:accounts.data??[]},options);transform.success({row_count:model.followers.total});return model;}catch(error){transform.failed(error);throw error;}
}
