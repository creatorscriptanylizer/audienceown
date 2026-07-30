import"server-only";import{randomUUID}from"node:crypto";import{createAdminClient}from"@/lib/supabase/admin";
import{publishDeliveryQueue}from"@/lib/update-delivery";import{aiConfiguration,AI_PROMPT_VERSION,modelBackedAiAvailable}from"./configuration";
import{deterministicVariants}from"./deterministic-fallback";import{AiEnhancementError}from"./errors";import{getAiProvider}from"./registry";
import type{CreatorVoiceProfile,DraftEnhancementInput,DraftVariantType}from"./types";import type{SocialProvider}from"@/lib/social-providers/types";
export async function processAiEnhancementJobs(limit=5){
 const admin=createAdminClient();if(!admin)throw new Error("AI worker is not configured.");const owner=randomUUID();
 const{data:jobs,error}=await admin.rpc("claim_ai_draft_enhancement_jobs",{p_limit:limit,p_lease_seconds:120,p_lease_owner:owner});if(error)throw error;
 const summary={claimed:jobs?.length??0,completed:0,applied:0,stale:0,fallbacks:0,retryableFailures:0,permanentFailures:0,autoPublished:0};
 for(const job of jobs??[]){const started=Date.now();try{
   const[{data:update},{data:settings},{data:imported}]=await Promise.all([
    admin.from("creator_updates").select("id,creator_id,status,title,content,cta_url,source_provider,source_external_id,source_published_at,source_metadata,deterministic_title,deterministic_content").eq("id",job.creator_update_id).maybeSingle(),
    admin.from("creator_ai_settings").select("*").eq("creator_id",job.creator_id).maybeSingle(),
    admin.from("imported_social_content").select("detection_event_id").eq("creator_update_id",job.creator_update_id).maybeSingle()]);
   if(!update||!settings)throw new AiEnhancementError("draft_ineligible","Draft or settings unavailable.");
   const{data:event}=imported?await admin.from("social_detection_events").select("object_type,event_type,source_payload").eq("id",imported.detection_event_id).maybeSingle():{data:null};
   const metadata=(update.source_metadata??{})as Record<string,unknown>;const profile:CreatorVoiceProfile={tone:settings.tone as CreatorVoiceProfile["tone"],
    audienceDescription:settings.audience_description,preferredTerminology:settings.preferred_terminology,phrasesToAvoid:settings.phrases_to_avoid,
    ctaStyle:settings.cta_style,customInstructions:settings.custom_voice_instructions,includeEmojis:settings.include_emojis,
    includeHashtags:settings.include_hashtags,preserveSourceTitle:settings.preserve_source_title};
   const input:DraftEnhancementInput={creatorId:job.creator_id,updateId:update.id,sourceProvider:update.source_provider as SocialProvider|null,
    sourceObjectType:event?.object_type??null,sourceEventType:event?.event_type??null,sourceTitle:typeof metadata.title==="string"?metadata.title:null,
    sourceDescription:typeof metadata.description==="string"?metadata.description:null,sourceUrl:update.cta_url,sourcePublishedAt:update.source_published_at,
    deterministicDraft:{title:update.deterministic_title??update.title,body:update.deterministic_content??update.content},creatorProfile:profile,
    requestedVariants:job.requested_variants as DraftVariantType[]};
   let provider="deterministic",model="deterministic-v1",variants=deterministicVariants(input),inputTokens:null|number=null,outputTokens:null|number=null,cost:null|number=0;
   const config=aiConfiguration(),monthStart=new Date();monthStart.setUTCDate(1);monthStart.setUTCHours(0,0,0,0);
   const{data:globalUsage}=await admin.from("ai_usage_events").select("estimated_cost_minor_units").gte("created_at",monthStart.toISOString());
   const globalCost=(globalUsage??[]).reduce((sum,row)=>sum+(row.estimated_cost_minor_units??0),0);
   const withinGlobalBudget=config.globalBudget===0||globalCost<config.globalBudget;
   if(settings.enabled&&modelBackedAiAvailable()&&withinGlobalBudget){const adapter=getAiProvider(settings.provider);if(adapter){const controller=new AbortController();
     const timer=setTimeout(()=>controller.abort(),aiConfiguration().timeoutMs);try{const result=await adapter.enhance(input,controller.signal);
      provider=result.provider;model=result.model;variants=result.variants;inputTokens=result.usage.inputTokens;outputTokens=result.usage.outputTokens;cost=result.usage.estimatedCostMinorUnits;
     }finally{clearTimeout(timer);}}}else summary.fallbacks++;
   const{data:completed,error:completeError}=await admin.rpc("complete_ai_draft_enhancement",{p_job_id:job.id,p_lease_owner:owner,p_provider:provider,
    p_model:model,p_variants:variants,p_input_tokens:inputTokens??0,p_output_tokens:outputTokens??0,p_estimated_cost:cost??0});if(completeError)throw completeError;
   const outcome=completed as{applied:boolean;stale:boolean};summary.completed++;if(outcome.applied)summary.applied++;if(outcome.stale)summary.stale++;
   if(outcome.applied&&job.auto_send_requested&&settings.ai_auto_send_enabled&&!settings.approval_required&&(!settings.ai_required||provider==="openai")){
    try{await publishDeliveryQueue(update.id,update.creator_id,null,admin);summary.autoPublished++;await admin.from("imported_social_content").update({status:"auto_published",
      approved_at:new Date().toISOString(),published_at:new Date().toISOString()}).eq("creator_update_id",update.id);}catch{/* Draft remains for approval. */}}
   console.info("ai_enhancement",{event:"job_completed",creatorId:job.creator_id,updateId:update.id,jobId:job.id,provider,model,
    promptVersion:AI_PROMPT_VERSION,status:"completed",latencyMs:Date.now()-started,inputTokens,outputTokens});
  }catch(error){const aiError=error instanceof AiEnhancementError?error:new AiEnhancementError("provider_unavailable","Enhancement failed.",true);
   const failed=await admin.rpc("fail_ai_draft_enhancement",{p_job_id:job.id,p_lease_owner:owner,p_error_code:aiError.code,
    p_error_message:aiError.message,p_retryable:aiError.retryable});const status=(failed.data as{status?:string}|null)?.status;
   if(status==="retryable_failure")summary.retryableFailures++;else summary.permanentFailures++;
   console.warn("ai_enhancement",{event:"job_failed",creatorId:job.creator_id,updateId:job.creator_update_id,jobId:job.id,
    provider:"openai",promptVersion:job.prompt_version,status,errorCode:aiError.code,latencyMs:Date.now()-started});}}
 return summary;
}
