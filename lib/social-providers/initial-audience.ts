import "server-only";
import type {createAdminClient} from "@/lib/supabase/admin";
import {fetchProviderAudienceMetric,nextAudienceSync,safeMetricError} from "@/lib/platform-audience/server";
import {providerAudienceCapabilities} from "@/lib/platform-audience/capabilities";
import type {AudienceProvider} from "@/lib/platform-audience/types";

type Admin=NonNullable<ReturnType<typeof createAdminClient>>;
export async function initializeProviderAudience(input:{db:Admin;creatorId:string;connectionId:string;provider:AudienceProvider;role:"official"|"backup";accessToken:string;stableId:string;loginMethod?:"instagram_login"|"facebook_login"}){
  const capability=providerAudienceCapabilities[input.provider],observedAt=new Date().toISOString();
  let count:number|null=null,status="unsupported",approximate=capability.approximate,errorCode:string|null=null;
  if(capability.supported){try{const metric=await fetchProviderAudienceMetric({provider:input.provider,accessToken:input.accessToken,stableId:input.stableId,loginMethod:input.loginMethod});count=metric.count;status=metric.status;approximate=metric.approximate;}catch(error){const safe=safeMetricError(error);status=safe.status;errorCode=safe.code;}}
  const result=await input.db.rpc("upsert_provider_audience_metric",{p_creator_id:input.creatorId,p_connection_id:input.connectionId,p_asset_binding_id:null as unknown as string,p_provider:input.provider,p_account_category:input.role,p_count:count as unknown as number,p_unit:count===null?null as unknown as string:capability.audienceUnit!,p_status:status,p_approximate:approximate,p_source_observed_at:count===null?null as unknown as string:observedAt,p_next_sync_at:capability.supported?nextAudienceSync(input.provider):null as unknown as string,p_error_code:errorCode as unknown as string});
  if(result.error)return{status:"error",metricId:null};
  if(count!==null)await input.db.rpc("append_provider_audience_snapshot",{p_metric_id:result.data});
  await input.db.from("connected_accounts").update({last_sync_at:observedAt}).eq("id",input.connectionId).eq("creator_id",input.creatorId);
  return{status,count,metricId:result.data};
}
