import { classifyBroadcastIntent, getIntentDefinition, type BroadcastIntent } from "@/lib/broadcast-studio";
import type { BroadcastStatus, BroadcastType } from "@/lib/updates";

export type ActivityKind = "update" | "emergency" | "account";
export type ActivityTab = "all" | "updates" | "emergency" | "account" | "scheduled" | "failed";
export type ActivityStatus = "delivered" | "scheduled" | "failed" | "draft" | "active" | "resolved" | "cancelled" | "attention" | "pending";
export type UpdateManagementAction = "CONTINUE_DRAFT"|"MANAGE_SCHEDULE"|"REVIEW_FAILURE"|"VIEW_DETAILS";
export type UpdateManagementPolicy = { canContinue:boolean;canDelete:boolean;canCancel:boolean;canReschedule:boolean;canRetry:boolean;canView:boolean;primaryAction:UpdateManagementAction|null };
export type ActivityInsight = { message:string;action:UpdateManagementAction|null };
export type ActivityItem = { id:string; canonicalUpdateId:string|null; kind:ActivityKind; subtype:string; occurredAt:string; platform:string|null; accountDisplay:string|null; title:string; description:string; status:ActivityStatus; messagePreview:string|null; recipientCount:number|null; recoveryDestinationSnapshot:string|null; detailHref:string|null; actionHref:string|null; managementPolicy:UpdateManagementPolicy|null; insight:ActivityInsight|null };
export type UpdateActivityRow = { id:string; broadcast_type:BroadcastType; broadcast_intent:BroadcastIntent; status:BroadcastStatus; title:string; subject:string; content:string; cta_url:string|null; scheduled_for:string|null; sent_at:string|null; queued_at:string|null; updated_at:string; affected_platform_connection_id:string|null; source_provider:string|null };
export type DeliveryActivityRow = { update_id:string; status:string; accepted_at:string|null; delivered_at:string|null; failed_at:string|null };
export type AccountActivityRow = { id:string; platform:string; label:string; external_account_name:string|null; account_type:string; connection_health:string; provider_status:string; last_connection_error:string|null; updated_at:string };
export type EmergencyActivityRow = { id:string; emergency_type:string; lifecycle_status:string; title:string; message:string; activated_at:string|null; resolved_at:string|null; cancelled_at:string|null; updated_at:string; creator_update_id:string|null; affected_accounts:unknown; replacement_accounts:unknown };
export type PublishingAccountActivityRow = { update_id:string; provider_snapshot:string; account_display_snapshot:string; role_snapshot:string; targeting_rule_snapshot:string };

function snapshotLabel(value:unknown){
  if(!Array.isArray(value)||!value.length)return null;
  const first=value[0];
  if(!first||typeof first!=="object")return null;
  const row=first as Record<string,unknown>,provider=typeof row.provider==="string"?row.provider:null,display=typeof row.display_handle==="string"?row.display_handle:typeof row.label==="string"?row.label:null;
  return [provider,display].filter(Boolean).join(" · ")||null;
}
function timestamp(row:UpdateActivityRow){return row.sent_at??row.scheduled_for??row.queued_at??row.updated_at}
export function accountNeedsAttention(row:AccountActivityRow){return row.account_type==="official"&&(row.connection_health==="degraded"||row.connection_health==="error"||row.provider_status==="revoked"||row.provider_status==="error"||Boolean(row.last_connection_error))}
export function activityMatchesTab(item:ActivityItem,tab:ActivityTab){return tab==="all"||tab==="updates"&&item.kind==="update"||tab==="emergency"&&item.kind==="emergency"||tab==="account"&&item.kind==="account"||tab==="scheduled"&&item.status==="scheduled"||tab==="failed"&&item.status==="failed"}
export function deriveUpdateManagementPolicy(input:{status:ActivityStatus;deliveryCount:number;emergency:boolean}):UpdateManagementPolicy {
  if(input.status==="scheduled")return{canContinue:false,canDelete:false,canCancel:true,canReschedule:false,canRetry:false,canView:true,primaryAction:"MANAGE_SCHEDULE"};
  if(input.emergency)return{canContinue:false,canDelete:false,canCancel:false,canReschedule:false,canRetry:false,canView:true,primaryAction:"VIEW_DETAILS"};
  if(input.status==="draft")return{canContinue:true,canDelete:input.deliveryCount===0,canCancel:false,canReschedule:false,canRetry:false,canView:true,primaryAction:"CONTINUE_DRAFT"};
  if(input.status==="failed")return{canContinue:false,canDelete:false,canCancel:false,canReschedule:false,canRetry:true,canView:true,primaryAction:"REVIEW_FAILURE"};
  return{canContinue:false,canDelete:false,canCancel:false,canReschedule:false,canRetry:false,canView:true,primaryAction:"VIEW_DETAILS"};
}
export function deriveUpdateActivityInsight(row:UpdateActivityRow,status:ActivityStatus):ActivityInsight|null {
  if(status==="draft")return row.broadcast_intent==="new_video"&&!row.cta_url?{message:"This New video draft still needs a destination link before it can be reviewed.",action:"CONTINUE_DRAFT"}:{message:"Your draft is ready for review.",action:"CONTINUE_DRAFT"};
  if(status==="failed")return{message:"This update failed during delivery. Review the recorded delivery status before retrying.",action:"REVIEW_FAILURE"};
  if(status==="scheduled"&&row.scheduled_for)return{message:"This update is scheduled for the time shown above. You can still manage it before delivery.",action:"MANAGE_SCHEDULE"};
  return null;
}

export function buildUpdatesActivity(input:{updates:UpdateActivityRow[];deliveries:DeliveryActivityRow[];accounts:AccountActivityRow[];emergencies:EmergencyActivityRow[];publishingAccounts?:PublishingAccountActivityRow[]}){
  const accountsById=new Map(input.accounts.map(row=>[row.id,row]));
  const deliveryByUpdate=new Map<string,DeliveryActivityRow[]>();
  for(const delivery of input.deliveries)deliveryByUpdate.set(delivery.update_id,[...(deliveryByUpdate.get(delivery.update_id)??[]),delivery]);
  const emergencyUpdateIds=new Set(input.emergencies.map(row=>row.creator_update_id).filter((id):id is string=>Boolean(id)));
  const publishingByUpdate=new Map<string,PublishingAccountActivityRow[]>();
  for(const target of input.publishingAccounts??[])publishingByUpdate.set(target.update_id,[...(publishingByUpdate.get(target.update_id)??[]),target]);
  const items:ActivityItem[]=[];
  for(const row of input.updates){
    if(emergencyUpdateIds.has(row.id)&&row.status!=="scheduled")continue;
    const definition=getIntentDefinition(row.broadcast_intent),classification=classifyBroadcastIntent(row.broadcast_intent),account=row.affected_platform_connection_id?accountsById.get(row.affected_platform_connection_id):null,publishing=publishingByUpdate.get(row.id)??[],deliveries=deliveryByUpdate.get(row.id)??[],delivered=deliveries.filter(item=>item.delivered_at).length;
    const kind:ActivityKind=classification.kind;
    const status:ActivityStatus=row.status==="scheduled"?"scheduled":row.status==="failed"||deliveries.some(item=>item.status==="failed")?"failed":row.status==="sent"||deliveries.some(item=>item.accepted_at)?"delivered":row.status==="draft"?"draft":"pending";
    items.push({id:`update:${row.id}`,canonicalUpdateId:row.id,kind,subtype:row.broadcast_intent,occurredAt:timestamp(row),platform:publishing[0]?.provider_snapshot??account?.platform??row.source_provider,accountDisplay:publishing.length?publishing.map(target=>`${target.provider_snapshot} · ${target.account_display_snapshot}${target.role_snapshot==="recovery"?" · Recovery context":" · Main context"}`).join(" | "):account?.external_account_name??account?.label??null,title:`${definition.title} ${status==="scheduled"?"scheduled":status==="delivered"?"sent":"update"}`,description:row.subject||row.title||"Audience communication",status,messagePreview:row.content||null,recipientCount:deliveries.length?(status==="scheduled"?deliveries.length:delivered):null,recoveryDestinationSnapshot:null,detailHref:`/dashboard/updates/${row.id}`,actionHref:null,managementPolicy:deriveUpdateManagementPolicy({status,deliveryCount:deliveries.length,emergency:kind==="emergency"}),insight:deriveUpdateActivityInsight(row,status)});
  }
  for(const row of input.accounts.filter(accountNeedsAttention)){
    const accountDisplay=row.external_account_name??row.label,reason=row.last_connection_error||row.provider_status==="revoked"?"Authorization requires attention":"Connection requires action";
    items.push({id:`account:${row.id}`,canonicalUpdateId:null,kind:"account",subtype:"connection_attention",occurredAt:row.updated_at,platform:row.platform,accountDisplay,title:`${row.platform} needs attention`,description:reason,status:"attention",messagePreview:null,recipientCount:null,recoveryDestinationSnapshot:null,detailHref:null,actionHref:"/dashboard/platforms",managementPolicy:null,insight:null});
  }
  for(const row of input.emergencies){
    const affected=snapshotLabel(row.affected_accounts),replacement=snapshotLabel(row.replacement_accounts),status:ActivityStatus=row.lifecycle_status==="active"?"active":row.lifecycle_status==="resolved"?"resolved":row.lifecycle_status==="cancelled"?"cancelled":"pending";
    items.push({id:`emergency:${row.id}`,canonicalUpdateId:row.creator_update_id,kind:"emergency",subtype:row.emergency_type,occurredAt:row.activated_at??row.resolved_at??row.cancelled_at??row.updated_at,platform:affected?.split(" · ")[0]??null,accountDisplay:affected,title:status==="active"?`Emergency activated${affected?` for ${affected}`:""}`:row.title,description:row.message,status,messagePreview:null,recipientCount:row.creator_update_id?(deliveryByUpdate.get(row.creator_update_id)??[]).filter(item=>item.accepted_at).length:null,recoveryDestinationSnapshot:replacement,detailHref:row.creator_update_id?`/dashboard/updates/${row.creator_update_id}`:"/dashboard/emergency",actionHref:null,managementPolicy:deriveUpdateManagementPolicy({status,deliveryCount:row.creator_update_id?(deliveryByUpdate.get(row.creator_update_id)??[]).length:0,emergency:true}),insight:null});
  }
  items.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));
  const attention=input.accounts.filter(accountNeedsAttention).map(row=>({id:row.id,platform:row.platform,label:row.external_account_name??row.label,reason:row.last_connection_error||row.provider_status==="revoked"?"Authorization requires attention":"Connection requires action",href:"/dashboard/platforms"}));
  return {items,attention};
}

export function activityMetrics(items:ActivityItem[],attentionCount:number,now:Date,days:"7"|"30"|"90"|"all"){
  const cutoff=days==="all"?null:new Date(now.getTime()-Number(days)*86400000).toISOString(),inRange=(item:ActivityItem)=>!cutoff||item.occurredAt>=cutoff,period=items.filter(inRange);
  return {sent:period.filter(item=>item.kind==="update"&&item.status==="delivered").length,scheduled:items.filter(item=>item.status==="scheduled"&&item.occurredAt>now.toISOString()).length,failed:period.filter(item=>item.status==="failed").length,attention:attentionCount};
}
