import { isDeliveryWorkerAuthorized } from "@/lib/delivery-worker-auth";import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(request:Request){if(!isDeliveryWorkerAuthorized(request.headers.get("authorization"),process.env.SOCIAL_WORKER_SECRET))
return Response.json({error:"Unauthorized"},{status:401});const admin=createAdminClient();if(!admin)return Response.json({error:"Not configured"},{status:503});
const[{data:connections},{data:events},{data:imports}]=await Promise.all([
admin.from("connected_accounts").select("platform,connection_health,provider_status,token_expires_at,lease_expires_at,last_sync_at").eq("watch_enabled",true),
admin.from("social_detection_events").select("provider,processing_status,detected_at").order("detected_at",{ascending:false}).limit(500),
admin.from("imported_social_content").select("status,created_at").order("created_at",{ascending:false}).limit(500)]);
const providers:Record<string,{active:number;healthy:number;unhealthy:number;expiredTokens:number;staleLeases:number;lastEvent:string|null}>= {};
for(const row of connections??[]){const item=providers[row.platform]??={active:0,healthy:0,unhealthy:0,expiredTokens:0,staleLeases:0,lastEvent:null};
item.active++;if(row.connection_health==="healthy")item.healthy++;else item.unhealthy++;if(row.token_expires_at&&Date.parse(row.token_expires_at)<Date.now())item.expiredTokens++;
if(row.lease_expires_at&&Date.parse(row.lease_expires_at)<Date.now())item.staleLeases++;}
for(const event of events??[]){const item=providers[event.provider];if(item&&!item.lastEvent)item.lastEvent=event.detected_at;}
return Response.json({providers,draftsGenerated:(imports??[]).filter((x)=>x.status==="draft_ready").length,
automaticPublications:(imports??[]).filter((x)=>x.status==="auto_published").length},{headers:{"cache-control":"no-store"}});}
