import { UpdatesActivityCommandCenter } from "@/components/updates-activity-command-center";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { logPageQueryFailure } from "@/lib/data-availability";
import { buildUpdatesActivity, type AccountActivityRow, type DeliveryActivityRow, type EmergencyActivityRow, type PublishingAccountActivityRow, type UpdateActivityRow } from "@/lib/updates-activity";
import { getUpcomingScheduledCommunications } from "@/lib/upcoming-scheduled-communications";

export const dynamic="force-dynamic";
export default async function UpdatesPage({searchParams}:PageProps<"/dashboard/updates">){
 const query=await searchParams,notice=query.notice==="draft_deleted"?"Draft deleted":null;
 const creator=await requireCreator(),supabase=await createClient(),generatedAt=new Date().toISOString();
 if(!supabase)return <UpdatesActivityCommandCenter items={[]} attention={[]} generatedAt={generatedAt} available={false} notice={notice}/>;
 const[updatesResult,deliveriesResult,accountsResult,emergenciesResult,publishingAccountsResult,upcomingResult]=await Promise.all([
  supabase.from("creator_updates").select("id,broadcast_type,broadcast_intent,status,title,subject,content,cta_url,scheduled_for,sent_at,queued_at,updated_at,affected_platform_connection_id,source_provider").eq("creator_id",creator.id).order("updated_at",{ascending:false}).limit(100),
  supabase.from("update_deliveries").select("update_id,status,accepted_at,delivered_at,failed_at").eq("creator_id",creator.id).order("updated_at",{ascending:false}).limit(1000),
  supabase.from("connected_accounts").select("id,platform,label,external_account_name,account_type,connection_health,provider_status,last_connection_error,updated_at").eq("creator_id",creator.id).eq("account_type","official").limit(100),
  supabase.from("creator_emergencies").select("id,emergency_type,lifecycle_status,title,message,activated_at,resolved_at,cancelled_at,updated_at,creator_update_id,emergency_alert_snapshots(affected_accounts,replacement_accounts,created_at)").eq("creator_id",creator.id).order("updated_at",{ascending:false}).limit(100),
  supabase.from("creator_update_publishing_accounts").select("update_id,provider_snapshot,account_display_snapshot,role_snapshot,targeting_rule_snapshot,creator_updates!inner(creator_id)").eq("creator_updates.creator_id",creator.id).limit(500),
  getUpcomingScheduledCommunications(supabase,creator.id,new Date(generatedAt)).then(data=>({data,error:null})).catch(error=>({data:[],error})),
 ]);
 for(const[name,result]of [["creator_updates",updatesResult],["update_deliveries",deliveriesResult],["connected_accounts",accountsResult],["creator_emergencies",emergenciesResult],["creator_update_publishing_accounts",publishingAccountsResult],["upcoming_scheduled_communications",upcomingResult]] as const)logPageQueryFailure("dashboard/updates",name,result.error);
 const available=!updatesResult.error&&!accountsResult.error&&!emergenciesResult.error&&!publishingAccountsResult.error&&!upcomingResult.error;
 if(!available)return <UpdatesActivityCommandCenter items={[]} attention={[]} generatedAt={generatedAt} available={false} notice={notice}/>;
 const emergencies=(emergenciesResult.data??[]).map(row=>{const snapshot=[...(row.emergency_alert_snapshots??[])].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];return{...row,affected_accounts:snapshot?.affected_accounts??[],replacement_accounts:snapshot?.replacement_accounts??[]}}) as EmergencyActivityRow[];
 const updatesById=new Map<string,UpdateActivityRow>();
 for(const row of [...(updatesResult.data??[]),...upcomingResult.data] as UpdateActivityRow[])updatesById.set(row.id,row);
 const model=buildUpdatesActivity({updates:[...updatesById.values()],deliveries:deliveriesResult.error?[]:(deliveriesResult.data??[]) as DeliveryActivityRow[],accounts:(accountsResult.data??[]) as AccountActivityRow[],emergencies,publishingAccounts:(publishingAccountsResult.data??[]) as PublishingAccountActivityRow[]});
 return <UpdatesActivityCommandCenter items={model.items} attention={model.attention} generatedAt={generatedAt} notice={notice}/>;
}
