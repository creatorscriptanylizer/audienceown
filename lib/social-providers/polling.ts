import "server-only";import { randomUUID } from "node:crypto";import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSocialSecret,encryptSocialSecret } from "@/lib/social-secrets";
import { getSocialProvider } from "./registry";import { isSocialProvider,validateNormalizedContent } from "./normalize";
import { isRetryableProviderError,SocialProviderError } from "./errors";
export async function pollSocialConnections(limit=20){
  const admin=createAdminClient();if(!admin)throw new Error("Social polling is not configured.");
  const{data:connections,error}=await admin.rpc("claim_social_connections",{p_limit:limit,p_lease_seconds:180,p_lease_owner:randomUUID()});
  if(error)throw error;const summary={claimed:connections?.length??0,polled:0,detected:0,duplicates:0,drafts:0,autoPublished:0,failed:0,byProvider:{} as Record<string,{claimed:number;detected:number;failed:number}>};
  for(const connection of connections??[]){if(!isSocialProvider(connection.platform))continue;const provider=connection.platform,adapter=getSocialProvider(provider);
    const providerSummary=summary.byProvider[provider]??={claimed:0,detected:0,failed:0};providerSummary.claimed++;
    try{if(!adapter.capabilities.polling||!adapter.pollContent)throw new SocialProviderError("provider_capability_not_supported",provider,"Polling unavailable.");
      const{data:secret}=await admin.from("platform_connection_secrets").select("*").eq("platform_connection_id",connection.id).maybeSingle();
      if(!secret)throw new SocialProviderError("access_revoked",provider,"Credentials unavailable.");let accessToken=decryptSocialSecret(secret.access_token_ciphertext);
      let refreshToken=secret.refresh_token_ciphertext?decryptSocialSecret(secret.refresh_token_ciphertext):undefined;
      if(connection.token_expires_at&&new Date(connection.token_expires_at).getTime()<Date.now()+60000&&adapter.refreshAccessToken){
        const token=await adapter.refreshAccessToken({accessToken,refreshToken,metadata:{...(connection.provider_metadata as Record<string,unknown>),externalAccountId:connection.external_account_id}});
        accessToken=token.accessToken;refreshToken=token.refreshToken??refreshToken;await admin.from("platform_connection_secrets").update({
          access_token_ciphertext:encryptSocialSecret(accessToken),refresh_token_ciphertext:refreshToken?encryptSocialSecret(refreshToken):null,
          token_scope:token.grantedScopes.join(" "),token_type:token.tokenType}).eq("platform_connection_id",connection.id);
        await admin.from("connected_accounts").update({token_expires_at:token.expiresAt,token_refreshed_at:new Date().toISOString(),granted_scopes:token.grantedScopes}).eq("id",connection.id);
      }
      const result=await adapter.pollContent({accessToken,refreshToken,cursor:connection.last_external_cursor,metadata:{...(connection.provider_metadata as Record<string,unknown>),externalAccountId:connection.external_account_id}});
      for(const candidate of result.items){const item=validateNormalizedContent(candidate);if(!item){summary.failed++;providerSummary.failed++;continue;}
        const{data:ingested,error:ingestError}=await admin.rpc("ingest_social_detection",{p_connection_id:connection.id,p_provider:provider,
          p_external_object_id:item.externalObjectId,p_external_event_id:item.externalEventId??"",p_object_type:item.objectType,p_event_type:item.eventType,
          p_source_payload:{...item.rawMetadata,title:item.title,description:item.description,canonical_url:item.canonicalUrl,thumbnail_url:item.thumbnailUrl,
            media_urls:item.mediaUrls,scheduled_start_at:item.scheduledStartAt,live_status:item.liveStatus},p_source_published_at:item.sourcePublishedAt,p_detection_source:"polling"});
        if(ingestError)throw ingestError;const ingestion=ingested as {event_id:string;inserted:boolean};if(!ingestion.inserted){summary.duplicates++;continue;}
        summary.detected++;providerSummary.detected++;if(connection.auto_create_drafts){const{data:draft,error:draftError}=await admin.rpc("create_social_draft",{p_event_id:ingestion.event_id});
          if(draftError)throw draftError;const created=draft as {update_id:string;created:boolean;auto_send:boolean};if(created.created)summary.drafts++;
          if(created.auto_send&&adapter.capabilities.automaticPublishing)await admin.rpc("enqueue_ai_draft_enhancement",{p_update_id:created.update_id,p_prompt_version:"social-draft-v1",p_requested_variants:["standard","concise","detailed","browser","sms","recovery"],p_auto_send_requested:true});}}
      const cadence=Number(process.env.SOCIAL_POLL_INTERVAL_MINUTES??5);await admin.rpc("mark_social_connection_healthy",{p_connection_id:connection.id,p_cursor:result.cursor??connection.last_external_cursor??"",
        p_next_sync_at:new Date(Date.now()+Math.max(1,cadence)*60000).toISOString()});summary.polled++;
    }catch(error){summary.failed++;providerSummary.failed++;const permanent=error instanceof SocialProviderError&&!isRetryableProviderError(error);
      const attempts=Math.max(1,providerSummary.failed),backoff=permanent?24*3600:Math.min(3600,30*2**Math.min(attempts,6))+Math.floor(Math.random()*30);
      await admin.rpc("mark_social_connection_unhealthy",{p_connection_id:connection.id,p_health:error instanceof SocialProviderError&&error.code==="access_revoked"?"revoked":"degraded",
        p_error:error instanceof SocialProviderError?error.code:"provider_failure",p_next_sync_at:new Date(Date.now()+backoff*1000).toISOString()});
    }}return summary;
}
