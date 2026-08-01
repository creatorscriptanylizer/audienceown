import { createHash } from "node:crypto";import { createAdminClient } from "@/lib/supabase/admin";import { getSocialProvider } from "@/lib/social-providers/registry";
import { isSocialProvider } from "@/lib/social-providers/normalize";
export async function POST(request:Request,{params}:{params:Promise<{provider:string}>}){const{provider}=await params;
  if(!isSocialProvider(provider))return Response.json({error:"Unknown provider"},{status:404});const adapter=getSocialProvider(provider);
  if(!adapter.capabilities.webhooks||!adapter.verifyWebhook||!adapter.normalizeWebhook)return Response.json({error:"provider_capability_not_supported"},{status:409});
  try{const verified=await adapter.verifyWebhook(request.clone());const challenge=(verified.payload.challenge);
    if(typeof challenge==="string")return new Response(challenge,{status:200,headers:{"content-type":"text/plain"}});
    const admin=createAdminClient();if(!admin)throw new Error("not configured");const digest=createHash("sha256").update(JSON.stringify(verified.payload)).digest("hex");
    const receipt=await admin.from("social_webhook_receipts").insert({provider,provider_event_id:verified.eventId,signature_verified:true,
      event_timestamp:new Date().toISOString(),payload_digest:digest}).select("id").maybeSingle();
    if(receipt.error?.code==="23505")return Response.json({status:"duplicate"});
    if(provider==="twitch"){const subscription=verified.payload.subscription;if(typeof subscription==="object"&&subscription!==null&&"id"in subscription&&typeof subscription.id==="string")await admin.from("twitch_eventsub_subscriptions").update({status:"enabled",last_event_at:new Date().toISOString()}).eq("provider_subscription_id",subscription.id);}
    const events=await adapter.normalizeWebhook(verified);let processed=0;
    for(const event of events){const connectionId=String((verified.payload.subscription as Record<string,unknown>|undefined)?.condition
      ? ((verified.payload.subscription as Record<string,unknown>).condition as Record<string,unknown>).broadcaster_user_id??"": "");
      const{data:connection}=await admin.from("connected_accounts").select("id").eq("platform",provider).eq("external_account_id",connectionId).maybeSingle();if(!connection)continue;
      if(provider==="twitch"&&verified.eventType==="authorization.revoke"){await admin.from("connected_accounts").update({connection_health:"revoked",last_connection_error:"authorization_revoked"}).eq("id",connection.id);continue;}
      const result=await admin.rpc("ingest_social_detection",{p_connection_id:connection.id,p_provider:provider,p_external_object_id:event.externalObjectId,
        p_external_event_id:event.externalEventId??verified.eventId,p_object_type:event.objectType,p_event_type:event.eventType,p_source_payload:{...event.rawMetadata,
          title:event.title,description:event.description,canonical_url:event.canonicalUrl,thumbnail_url:event.thumbnailUrl},p_source_published_at:event.sourcePublishedAt,p_detection_source:"webhook"});
      if(!result.error&&(result.data as{inserted:boolean}).inserted){await admin.rpc("create_social_draft",{p_event_id:(result.data as{event_id:string}).event_id});processed++;}}
    await admin.from("social_webhook_receipts").update({processing_status:"processed"}).eq("provider_event_id",verified.eventId).eq("provider",provider);
    return Response.json({status:"processed",events:processed});}catch{return Response.json({error:"Webhook verification failed"},{status:401});}}
