"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateDraftSchema, updatePublishSchema } from "@/lib/updates";
import { PublicationError, publishDeliveryQueue } from "@/lib/update-delivery";
import { broadcastIntents, classifyBroadcastIntent, getAlertAudienceCopyDefinition, getAlertComposerDefinition, getIntentDefinition, type BroadcastIntent } from "@/lib/broadcast-studio";
import { validateScheduleInput } from "@/lib/scheduling";
import { NewVideoTargetingError, replaceUpdateContextAccounts, replaceUpdatePublishingAccounts, resolveConnectedAccountContext, resolveNewVideoAudience } from "@/lib/new-video-targeting";
import { debugError, debugLog } from "@/lib/debug";
import { resolveCommunicationAudiencePreview } from "@/lib/communication-audience";
import { z } from "zod";
import { recoverySituations, selectedRecoveryDestinationIdsFrom, type RecoverySituation } from "@/lib/recovery-communication";
import { RecoveryDestinationError, resolveRecoveryCommunicationDestinations } from "@/lib/recovery-communication-destinations";

export type UpdateActionState = {
  error?: string;
  errors?: Record<string, string[]>;
  result?: {
    kind: "zero_audience" | "sent" | "error";
    operation?: "publish" | "schedule";
    intent: BroadcastIntent;
    heading: string;
    message: string;
    uniqueRecipientCount?: number;
    queuedDeliveryCount?: number;
    byTransport?: Record<"email" | "sms" | "whatsapp" | "browser_notification", number>;
    destinationLabels?: string[];
  };
};

function emergencySendDebug(metadata: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production" && process.env.AUDIENCEOWN_DEBUG === "1") {
    console.info("[AUDIENCEOWN EMERGENCY SEND]", metadata);
  }
}

function scheduleDebug(metadata: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production" && process.env.AUDIENCEOWN_DEBUG === "1") {
    console.info("[AUDIENCEOWN SCHEDULE]", metadata);
  }
}

function valuesFrom(data: FormData) {
  const intentCandidate = String(data.get("broadcast_intent") ?? "");
  const intent = broadcastIntents.includes(intentCandidate as BroadcastIntent)
    ? intentCandidate as BroadcastIntent
    : "new_video";
  const classification = classifyBroadcastIntent(intent);
  const situationCandidate = String(data.get("recovery_situation") ?? "");
  const selectedRecoveryAccountIds = selectedRecoveryDestinationIdsFrom(data);
  return {
    broadcast_intent: intent,
    selected_account_ids: data.getAll("selected_account_ids").map(String).filter(Boolean),
    selected_recovery_account_ids: selectedRecoveryAccountIds,
    recovery_situation: (recoverySituations.some((item) => item.key === situationCandidate) ? situationCandidate : "inaccessible") as RecoverySituation,
    affected_platform_connection_id: String(data.get("affected_platform_connection_id") ?? "") || null,
    broadcast_type: classification.broadcastType,
    title: data.get("title"),
    subject: data.get("subject"),
    preview_text: data.get("preview_text"),
    content: data.get("content"),
    cta_label: data.get("cta_label"),
    cta_url: data.get("cta_url"),
  };
}

export type NewVideoAudiencePreviewState = {
  error?: string;
  accounts?: Awaited<ReturnType<typeof resolveNewVideoAudience>>["accounts"];
  emergencyAccounts?: Awaited<ReturnType<typeof resolveCommunicationAudiencePreview>>["accounts"];
  uniqueEligible?: number;
  channelBreakdown?: Awaited<ReturnType<typeof resolveCommunicationAudiencePreview>>["channelBreakdown"];
  zeroAudience?: boolean;
  explanation?: string;
};

export async function previewNewVideoAudience(accountIds: string[]): Promise<NewVideoAudiencePreviewState> {
  return previewCommunicationAudience("new_video", accountIds);
}

export async function previewCommunicationAudience(intentInput: BroadcastIntent, accountIds: string[] = []): Promise<NewVideoAudiencePreviewState> {
  const creator = await requireCreator();
  const intent = broadcastIntents.includes(intentInput) ? intentInput : null;
  if (!intent) return { error: "Select a valid alert type." };
  if (intent !== "new_video") {
    if (getIntentDefinition(intent).mandatory && (accountIds.length > 21 || accountIds.some((id) => !z.string().uuid().safeParse(id).success))) {
      return { error: "Select valid connected accounts." };
    }
    try {
      const result = await resolveCommunicationAudiencePreview(creator.id, intent, accountIds);
      const audienceCopy = getAlertAudienceCopyDefinition(intent);
      return { emergencyAccounts: result.accounts, uniqueEligible: result.uniqueEligible, channelBreakdown: result.channelBreakdown, zeroAudience: result.zeroAudience, explanation: getIntentDefinition(intent).mandatory ? "Unique opted-in followers across the selected Main and Recovery accounts, deduplicated before delivery." : `Recovery Pass followers who are ${audienceCopy.optInCopy}.` };
    } catch { return { error: "Eligible audience could not be calculated. Try again." }; }
  }
  if (accountIds.length > 20 || accountIds.some((id) => !z.string().uuid().safeParse(id).success)) {
    return { error: "Select valid connected accounts." };
  }
  try {
    const result = await resolveNewVideoAudience(creator.id, accountIds);
    return { accounts: result.accounts, emergencyAccounts: result.accounts.map((account) => ({ accountId: account.id, provider: account.provider, displayName: account.displayName, role: account.role, optedInFollowerCount: account.eligible })), uniqueEligible: result.uniqueEligible, channelBreakdown: { email: result.uniqueEligible, sms: 0, whatsapp: 0, browser_notification: 0 }, zeroAudience: result.uniqueEligible === 0, explanation: result.explanation };
  } catch (error) {
    return { error: error instanceof NewVideoTargetingError && error.code === "invalid_accounts"
      ? "One of the selected accounts is no longer available. Review your audience before sending."
      : "Eligible audience could not be calculated. Try again." };
  }
}

async function validateTarget(
  creatorId: string,
  values: ReturnType<typeof valuesFrom>,
  requireRecoveryDestination = false,
): Promise<UpdateActionState | null> {
  const definition = getIntentDefinition(values.broadcast_intent);
  const recoveryCommunication = definition.mandatory;
  if (values.broadcast_intent === "new_video") {
    if (!values.selected_account_ids.length) return { error: "Select where you published the video.", errors: { selected_account_ids: ["Select at least one connected account."] } };
    if (values.selected_account_ids.length > 20 || values.selected_account_ids.some((id) => !z.string().uuid().safeParse(id).success)) return { error: "Select valid connected accounts." };
    try { await resolveNewVideoAudience(creatorId, values.selected_account_ids); return null; }
    catch { return { error: "One of the selected accounts is no longer available. Review your audience before sending." }; }
  }
  if (getIntentDefinition(values.broadcast_intent).platform === "optional" && values.selected_account_ids.length) {
    if (values.selected_account_ids.length > 20 || values.selected_account_ids.some((id) => !z.string().uuid().safeParse(id).success)) return { error: "Select valid connected accounts." };
    try { await resolveConnectedAccountContext(creatorId, values.selected_account_ids); }
    catch { return { error: "One of the selected accounts is no longer available. Review your account context." }; }
  }
  if (definition.platform === "required" && !values.affected_platform_connection_id) {
    return { error: "Select the affected platform.", errors: { affected_platform_connection_id: ["Select the affected platform."] } };
  }
  if (recoveryCommunication && requireRecoveryDestination && !values.selected_recovery_account_ids.length) {
    return { error: "Choose at least one trusted Recovery destination.", errors:{selected_recovery_account_ids:["Choose at least one trusted Recovery destination."]} };
  }
  if (recoveryCommunication && values.selected_recovery_account_ids.length) {
    if (values.selected_recovery_account_ids.length>20 || values.selected_recovery_account_ids.some((id)=>!z.string().uuid().safeParse(id).success) || !values.affected_platform_connection_id) return {error:"Select valid linked Recovery destinations."};
    try {
      await resolveRecoveryCommunicationDestinations(creatorId,values.affected_platform_connection_id,values.selected_recovery_account_ids);
    } catch(error) {
      return {error:error instanceof RecoveryDestinationError&&error.code==="invalid_destinations"?"Every Recovery destination must belong to the selected Main account's Recovery Network.":"Recovery destinations are temporarily unavailable."};
    }
  }
  if (recoveryCommunication && values.cta_url && !values.selected_recovery_account_ids.length) {
    return { error: "Choose at least one trusted Recovery destination." };
  }
  if (definition.platform === "none" && values.affected_platform_connection_id) {
    return { error: "This broadcast intent cannot target a platform." };
  }
  if (!values.affected_platform_connection_id) return null;
  if (!z.string().uuid().safeParse(values.affected_platform_connection_id).success) return { error: "Select a valid connected platform." };
  const supabase = await createClient();
  const { data: account } = supabase
    ? await supabase.from("connected_accounts").select("id").eq("id", values.affected_platform_connection_id)
      .eq("creator_id", creatorId).eq("account_type", "official").maybeSingle()
    : { data: null };
  return account ? null : { error: "That platform is not one of your connected official accounts." };
}

function validationState(error: { flatten(): { fieldErrors: Record<string, string[]> } }): UpdateActionState {
  return { error: "Check the highlighted fields.", errors: error.flatten().fieldErrors };
}

function mutationError(message: string): UpdateActionState {
  return { error: message };
}

function emergencyPublishError(
  intent: BroadcastIntent,
  message: string,
  errors?: Record<string, string[]>,
): UpdateActionState {
  return {
    ...(errors ? { errors } : {}),
    result: {
      kind: "error",
      intent,
      heading: "Emergency alert could not be sent.",
      message,
    },
  };
}

function emergencyTargetGuardStage(state: UpdateActionState) {
  if (state.errors?.affected_platform_connection_id) return "guard_missing_affected_account";
  if (state.errors?.selected_recovery_account_ids) return "guard_missing_recovery_destinations";
  if (state.error === "Select valid linked Recovery destinations.") return "guard_invalid_recovery_destination_ids";
  if (state.error === "Every Recovery destination must belong to the selected Main account's Recovery Network.") return "guard_invalid_recovery_destinations";
  if (state.error === "Recovery destinations are temporarily unavailable.") return "guard_recovery_destinations_unavailable";
  if (state.error === "That platform is not one of your connected official accounts.") return "guard_creator_account_mismatch";
  return "guard_target_validation_failed";
}

async function recoveryPersistenceContext(creatorId:string,values:ReturnType<typeof valuesFrom>){
  const [main]=await resolveConnectedAccountContext(creatorId,[values.affected_platform_connection_id!]);
  const destinations=await resolveRecoveryCommunicationDestinations(creatorId,values.affected_platform_connection_id!,values.selected_recovery_account_ids);
  const destinationSummary=destinations.map(item=>`${item.provider} · ${item.displayName}`).join(", ");
  return {destinations,sourceMetadata:{recovery_situation:values.recovery_situation,affected_main_account:{provider:main.provider,display_name:main.displayName},selected_recovery_destination_count:destinations.length,recovery_destination_providers:destinations.map(item=>item.provider),recovery_destination_display_names:destinations.map(item=>item.displayName),description:`Affected Main account: ${main.provider} · ${main.displayName}. Trusted Recovery destinations (${destinations.length}): ${destinationSummary}.`}};
}

function reviewValidationState(values: ReturnType<typeof valuesFrom>, parsed: ReturnType<typeof updatePublishSchema.safeParse>): UpdateActionState | null {
  if (!parsed.success) return validationState(parsed.error);
  const destinationMode = getAlertComposerDefinition(values.broadcast_intent).destinationMode;
  if (destinationMode === "optional" && !values.cta_url) return null;
  try {
    if (!values.cta_url || new URL(String(values.cta_url)).protocol !== "https:") {
      return { error: "Check the highlighted fields.", errors: { cta_url: ["Add a valid HTTPS destination URL."] } };
    }
  } catch {
    return { error: "Check the highlighted fields.", errors: { cta_url: ["Add a valid HTTPS destination URL."] } };
  }
  return null;
}

export async function createDraft(_: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const creator = await requireCreator();
  const values = valuesFrom(data);
  const continueToReview = data.get("continue_to_review") === "true";
  if (continueToReview) debugLog("general", { area: getIntentDefinition(values.broadcast_intent).mandatory?"recovery":"new_video", event: getIntentDefinition(values.broadcast_intent).mandatory?"recovery_continue_to_review_started":"continue_to_review_started", existingDraft: false });
  const targetError = await validateTarget(creator.id, values, continueToReview);
  if (targetError) return targetError;
  const parsed = updateDraftSchema.safeParse(values);
  if (!parsed.success) return validationState(parsed.error);
  if (continueToReview) {
    const reviewError = reviewValidationState(values, updatePublishSchema.safeParse(values));
    if (reviewError) {
      debugLog("general", { area: "new_video", event: "continue_to_review_failed", stage: "validation" });
      return reviewError;
    }
    if(getIntentDefinition(values.broadcast_intent).mandatory)debugLog("general",{area:"recovery",event:"recovery_draft_validation_passed",existingDraft:false,destinationCount:values.selected_recovery_account_ids.length});
  }

  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  if (values.broadcast_intent === "new_video") {
    try {
      const resolution = await resolveNewVideoAudience(creator.id, values.selected_account_ids);
      const admin = createAdminClient();
      if (!admin) return mutationError("Updates are unavailable until Supabase is configured.");
      const { data: updateId, error } = await admin.rpc("create_new_video_draft_with_publishing_accounts", {
        p_creator_id: creator.id,
        p_draft: { ...parsed.data, cta_label: parsed.data.cta_label || null, cta_url: parsed.data.cta_url || null },
        p_accounts: resolution.accounts,
      });
      if (error || !updateId) {
        console.error("new_video_draft_atomic_create_failed", { creatorId: creator.id, code: error?.code, message: error?.message, details: error?.details });
        if (continueToReview) debugError("general", error ?? new Error("Atomic draft creation returned no ID."), { area: "new_video", event: "continue_to_review_failed", stage: "persistence" });
        return mutationError("The draft could not be created. Nothing was saved. Try again.");
      }
      revalidatePath("/dashboard/updates");
      if (continueToReview) {
        debugLog("general", { area: "new_video", event: "draft_saved_for_review", existingDraft: false });
        debugLog("general", { area: "new_video", event: "review_navigation_ready" });
      }
      redirect(`/dashboard/updates/${updateId}${continueToReview ? "?review=1" : ""}`);
    } catch (error) {
      if (error instanceof NewVideoTargetingError) return mutationError("One of the selected accounts is no longer available. Review your publishing accounts.");
      throw error;
    }
  }
  if (getIntentDefinition(values.broadcast_intent).mandatory) {
    const admin=createAdminClient();
    if(!admin)return mutationError("Updates are unavailable until Supabase is configured.");
    const {sourceMetadata}=await recoveryPersistenceContext(creator.id,values);
    const {data:updateId,error}=await admin.rpc("create_recovery_communication_draft",{p_creator_id:creator.id,p_draft:{...parsed.data,broadcast_intent:values.broadcast_intent,affected_platform_connection_id:values.affected_platform_connection_id,cta_label:parsed.data.cta_label||null,cta_url:parsed.data.cta_url||null,source_metadata:sourceMetadata},p_destination_ids:values.selected_recovery_account_ids});
    if(error||!updateId)return mutationError("The Recovery communication draft could not be saved. Nothing was changed.");
    revalidatePath("/dashboard/updates");
    if(continueToReview){debugLog("general",{area:"recovery",event:"recovery_draft_saved_for_review",existingDraft:false,destinationCount:values.selected_recovery_account_ids.length});debugLog("general",{area:"recovery",event:"recovery_review_navigation_ready",existingDraft:false});}
    redirect(`/dashboard/updates/${updateId}${continueToReview?"?review=1":""}`);
  }
  const { data: update, error } = await supabase.from("creator_updates").insert({
    creator_id: creator.id,
    ...parsed.data,
    broadcast_intent: values.broadcast_intent,
    affected_platform_connection_id: values.affected_platform_connection_id,
    cta_label: parsed.data.cta_label || null,
    cta_url: parsed.data.cta_url || null,
    ...(getIntentDefinition(values.broadcast_intent).mandatory ? { source_metadata: { recovery_situation: values.recovery_situation } } : {}),
  }).select("id").single();
  if (error || !update) return mutationError("The draft could not be created.");
  if (getIntentDefinition(values.broadcast_intent).platform === "optional" && values.selected_account_ids.length) {
    try { await replaceUpdateContextAccounts(update.id, creator.id, values.selected_account_ids); }
    catch { return mutationError("The draft was saved, but its connected-account context could not be saved."); }
  }
  revalidatePath("/dashboard/updates");
  redirect(`/dashboard/updates/${update.id}${data.get("continue_to_review") === "true" ? "?review=1" : ""}`);
}

export async function updateDraft(id: string, _: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const creator = await requireCreator();
  const values = valuesFrom(data);
  const continueToReview = data.get("continue_to_review") === "true";
  if (continueToReview) debugLog("general", { area: getIntentDefinition(values.broadcast_intent).mandatory?"recovery":"new_video", event: getIntentDefinition(values.broadcast_intent).mandatory?"recovery_continue_to_review_started":"continue_to_review_started", existingDraft: true });
  const targetError = await validateTarget(creator.id, values, continueToReview);
  if (targetError) return targetError;
  const parsed = updateDraftSchema.safeParse(values);
  if (!parsed.success) return validationState(parsed.error);
  if (continueToReview) {
    const reviewError = reviewValidationState(values, updatePublishSchema.safeParse(values));
    if (reviewError) {
      debugLog("general", { area: "new_video", event: "continue_to_review_failed", stage: "validation", existingDraft: true });
      return reviewError;
    }
    if(getIntentDefinition(values.broadcast_intent).mandatory)debugLog("general",{area:"recovery",event:"recovery_draft_validation_passed",existingDraft:true,destinationCount:values.selected_recovery_account_ids.length});
  }

  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  if(getIntentDefinition(values.broadcast_intent).mandatory){
    const admin=createAdminClient();
    if(!admin)return mutationError("Updates are unavailable until Supabase is configured.");
    const {sourceMetadata}=await recoveryPersistenceContext(creator.id,values);
    const {data:saved,error}=await admin.rpc("update_recovery_communication_draft",{p_update_id:id,p_creator_id:creator.id,p_draft:{...parsed.data,broadcast_intent:values.broadcast_intent,affected_platform_connection_id:values.affected_platform_connection_id,cta_label:parsed.data.cta_label||null,cta_url:parsed.data.cta_url||null,source_metadata:sourceMetadata},p_destination_ids:values.selected_recovery_account_ids});
    if(error||!saved)return mutationError("The Recovery communication draft and its destinations could not be saved. Nothing was changed.");
    revalidatePath("/dashboard/updates");revalidatePath(`/dashboard/updates/${id}`);
    if(continueToReview){debugLog("general",{area:"recovery",event:"recovery_draft_saved_for_review",existingDraft:true,destinationCount:values.selected_recovery_account_ids.length});debugLog("general",{area:"recovery",event:"recovery_review_navigation_ready",existingDraft:true});}
    redirect(`/dashboard/updates/${id}${continueToReview?"?review=1":""}`);
  }
  const { data: update, error } = await supabase.from("creator_updates").update({
    broadcast_type: parsed.data.broadcast_type,
    broadcast_intent: values.broadcast_intent,
    affected_platform_connection_id: values.affected_platform_connection_id,
    title: parsed.data.title,
    subject: parsed.data.subject,
    preview_text: parsed.data.preview_text,
    content: parsed.data.content,
    cta_label: parsed.data.cta_label || null,
    cta_url: parsed.data.cta_url || null,
    ...(getIntentDefinition(values.broadcast_intent).mandatory ? { source_metadata: { recovery_situation: values.recovery_situation } } : {}),
  }).eq("id", id).eq("creator_id", creator.id).in("status", ["draft", "cancelled"]).select("id").maybeSingle();

  if (error || !update) return mutationError("Only your draft or cancelled updates can be edited.");
  if (values.broadcast_intent === "new_video") {
    try { await replaceUpdatePublishingAccounts(id, creator.id, values.selected_account_ids); }
    catch (error) {
      if (continueToReview) debugError("general", error, { area: "new_video", event: "continue_to_review_failed", stage: "publishing_context", existingDraft: true });
      return mutationError("The publishing accounts could not be saved.");
    }
  } else if (getIntentDefinition(values.broadcast_intent).platform === "optional") {
    try { await replaceUpdateContextAccounts(id, creator.id, values.selected_account_ids); }
    catch { return mutationError("The connected-account context could not be saved."); }
  }
  revalidatePath("/dashboard/updates");
  revalidatePath(`/dashboard/updates/${id}`);
  if (continueToReview) {
    debugLog("general", { area: "new_video", event: "draft_saved_for_review", existingDraft: true });
    debugLog("general", { area: "new_video", event: "review_navigation_ready" });
  }
  redirect(`/dashboard/updates/${id}${continueToReview ? "?review=1" : ""}`);
}

export async function deleteDraft(id: string, previousState: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  void previousState;
  void data;
  if (!z.string().uuid().safeParse(id).success) return mutationError("This draft is unavailable.");
  const creator = await requireCreator();
  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  const [draftResult,deliveryResult,emergencyResult,importResult] = await Promise.all([
    supabase.from("creator_updates").select("id").eq("id",id).eq("creator_id",creator.id).eq("status","draft").maybeSingle(),
    supabase.from("update_deliveries").select("id").eq("update_id",id).eq("creator_id",creator.id).limit(1).maybeSingle(),
    supabase.from("creator_emergencies").select("id").eq("creator_update_id",id).eq("creator_id",creator.id).limit(1).maybeSingle(),
    supabase.from("imported_social_content").select("id").eq("creator_update_id",id).limit(1).maybeSingle(),
  ]);
  if (draftResult.error || deliveryResult.error || emergencyResult.error || importResult.error) return mutationError("Draft deletion is temporarily unavailable.");
  if (!draftResult.data) return mutationError("Only your draft updates can be deleted.");
  if (deliveryResult.data || emergencyResult.data || importResult.data) return mutationError("This draft has operational history and cannot be deleted.");
  const { data: deleted, error } = await supabase.from("creator_updates")
    .delete().eq("id", id).eq("creator_id", creator.id).eq("status", "draft").select("id").maybeSingle();

  if (error || !deleted) return mutationError("Only your draft updates can be deleted.");
  revalidatePath("/dashboard/updates");
  redirect("/dashboard/updates?notice=draft_deleted");
}

async function commitPublication(
  id: string,
  data: FormData,
  scheduledFor: string | null,
  timeZone?: string,
): Promise<UpdateActionState> {
  const values = valuesFrom(data);
  const emergency = getIntentDefinition(values.broadcast_intent).mandatory && !scheduledFor;
  const guardReturn = (stage: string, state: UpdateActionState): UpdateActionState => {
    if (!emergency) return state;
    emergencySendDebug({ stage, updateId: id, intent: values.broadcast_intent });
    return state.result
      ? state
      : emergencyPublishError(
          values.broadcast_intent,
          state.error ?? "Nothing was sent. Review the alert and try again.",
          state.errors,
        );
  };
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return guardReturn("guard_invalid_update_id", mutationError("This broadcast is unavailable."));
  const creator = await requireCreator();
  const targetError = await validateTarget(creator.id, values, true);
  if (targetError) return guardReturn(emergencyTargetGuardStage(targetError), targetError);
  const parsed = updatePublishSchema.safeParse(values);
  if (!parsed.success) return guardReturn("guard_publish_schema_failed", validationState(parsed.error));
  const mandatory = getIntentDefinition(values.broadcast_intent).mandatory;
  let recoveryContext: Awaited<ReturnType<typeof recoveryPersistenceContext>> | null = null;
  if (mandatory) {
    try {
      recoveryContext = await recoveryPersistenceContext(creator.id, values);
    } catch {
      return guardReturn("guard_recovery_context_failed", mutationError("Recovery destinations could not be verified. Nothing was sent."));
    }
  }

  const supabase = await createClient();
  if (!supabase) return guardReturn("guard_publishing_unavailable", mutationError("Broadcast publishing is unavailable."));
  const { data: current, error: currentError } = await supabase.from("creator_updates").select("status")
    .eq("id", id).eq("creator_id", creator.id).maybeSingle();
  if (currentError) return guardReturn("guard_status_lookup_failed", mutationError("Broadcast status is temporarily unavailable."));
  const allowedStatus = scheduledFor ? ["draft", "cancelled"] : ["draft", "cancelled", "queued"];
  if (!current || !allowedStatus.includes(current.status)) {
    return guardReturn("guard_update_not_editable", mutationError(scheduledFor
      ? "Only an editable draft can be scheduled."
      : "Only an editable or already queued broadcast can be published."));
  }
  if (current.status !== "queued") {
    const recoverySave=mandatory?await createAdminClient()?.rpc("update_recovery_communication_draft",{p_update_id:id,p_creator_id:creator.id,p_draft:{...parsed.data,broadcast_intent:values.broadcast_intent,affected_platform_connection_id:values.affected_platform_connection_id,cta_label:parsed.data.cta_label||null,cta_url:parsed.data.cta_url||null,source_metadata:recoveryContext!.sourceMetadata},p_destination_ids:values.selected_recovery_account_ids}):null;
    const { data: saved, error } = mandatory ? {data:recoverySave?.data,error:recoverySave?.error} : await supabase.from("creator_updates").update({
      ...parsed.data,
      broadcast_intent: values.broadcast_intent,
      affected_platform_connection_id: values.affected_platform_connection_id,
      cta_label: parsed.data.cta_label || null,
      cta_url: parsed.data.cta_url || null,
      ...(getIntentDefinition(values.broadcast_intent).mandatory ? { source_metadata: { recovery_situation: values.recovery_situation } } : {}),
    }).eq("id", id).eq("creator_id", creator.id).in("status", ["draft", "cancelled"]).select("id").maybeSingle();
    if (error || !saved) return guardReturn("guard_draft_persistence_failed", mutationError("Only an editable draft can be published."));
    if (values.broadcast_intent === "new_video") {
      try { await replaceUpdatePublishingAccounts(id, creator.id, values.selected_account_ids); }
      catch { return mutationError("One of the selected accounts is no longer available. Review your audience before sending."); }
    } else if (getIntentDefinition(values.broadcast_intent).platform === "optional") {
      try { await replaceUpdateContextAccounts(id, creator.id, values.selected_account_ids); }
      catch { return mutationError("One of the selected accounts is no longer available. Review your account context before sending."); }
    }
  }

  let summary;
  try {
    summary = await publishDeliveryQueue(id, creator.id, scheduledFor);
  } catch (error) {
    if (error instanceof PublicationError && error.code === "zero_audience") {
      if (emergency) {
        emergencySendDebug({ stage: "zero_audience_return", updateId: id, resultKind: "zero_audience", uniqueEligibleFollowerCount: 0, uniqueDeliverableFollowerCount: 0 });
      }
      const audienceCopy = getAlertAudienceCopyDefinition(values.broadcast_intent);
      return { result: { kind: "zero_audience", operation: scheduledFor ? "schedule" : "publish", intent: values.broadcast_intent, heading: scheduledFor ? audienceCopy.zeroScheduleHeading : emergency ? "No eligible followers to alert yet" : audienceCopy.zeroResultHeading, message: scheduledFor ? audienceCopy.zeroScheduleMessage : emergency ? "No opted-in followers from the selected accounts are currently eligible to receive this Emergency Alert. Your draft is saved and nothing was sent." : "Your draft is saved and nothing was sent." } };
    }
    if (error instanceof PublicationError && error.code === "preparation_failed" && !emergency) {
      return mutationError(scheduledFor
        ? "Scheduling failed. Nothing was scheduled. Your draft is safe. Try again."
        : "The draft was saved, but its recipients could not be prepared. Nothing was queued.");
    }
    if (error instanceof PublicationError && error.code === "schedule_too_soon") {
      return {
        error: "Choose a time at least one minute from now.",
        errors: { scheduled_for_local: ["Choose a time at least one minute from now."] },
      };
    }
    if (emergency) return emergencyPublishError(values.broadcast_intent, "Nothing was sent. Try again.");
    return mutationError(scheduledFor
      ? "Scheduling failed. Nothing was scheduled. Your draft is safe. Try again."
      : "The draft was saved, but publication could not be completed. Nothing was queued.");
  }
  await createAdminClient()?.from("imported_social_content").update({
    status: scheduledFor ? "approved" : "published",
    approved_at: new Date().toISOString(),
    ...(scheduledFor ? {} : { published_at: new Date().toISOString() }),
  }).eq("creator_update_id", id);
  if (!scheduledFor) {
    console.info("social_automation", { event: "approval_published", provider: "youtube", updateId: id });
  }
  if (emergency) {
    revalidatePath("/dashboard/updates");
    revalidatePath(`/dashboard/updates/${id}`);
    return { result: { kind: "sent", intent: values.broadcast_intent, heading: "Emergency alert sent", message: `${summary.eligible.toLocaleString()} unique ${summary.eligible === 1 ? "follower was" : "followers were"} queued for delivery.`, uniqueRecipientCount: summary.eligible, queuedDeliveryCount: summary.queued, byTransport: summary.byTransport, destinationLabels: recoveryContext?.destinations.map(destination => `${destination.provider} · ${destination.displayName}`) ?? [] } };
  }
  const query = new URLSearchParams({
    status: summary.status,
    updateId: summary.updateId,
    queued: String(summary.queued),
    eligible: String(summary.eligible),
    duplicates: String(summary.duplicates),
    excluded: String(summary.excluded),
    ...(summary.scheduledFor ? { scheduledFor: summary.scheduledFor } : {}),
    ...(timeZone ? { timeZone } : {}),
    ...Object.fromEntries(Object.entries(summary.byTransport).map(([key, value]) => [key, String(value)])),
  });
  revalidatePath("/dashboard/updates");
  revalidatePath(`/dashboard/updates/${id}`);
  revalidatePath("/dashboard");
  if (scheduledFor) scheduleDebug({ stage: "schedule_returning", resultPresent: true, resultKind: "scheduled", hasError: false, scheduledFor, redirecting: true });
  redirect(`/dashboard/updates/${id}?${query}`);
}

export async function publishUpdate(id: string, previous: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const intentCandidate = String(data.get("broadcast_intent") ?? "");
  const intent = broadcastIntents.includes(intentCandidate as BroadcastIntent) ? intentCandidate as BroadcastIntent : "new_video";
  const emergency = getIntentDefinition(intent).mandatory;
  if (emergency) emergencySendDebug({ stage: "publish_entered", updateId: id, intent, previousResultKind: previous.result?.kind ?? null });
  try {
    const result = await commitPublication(id, data, null);
    if (emergency && !result.result) {
      emergencySendDebug({ stage: "invariant_missing_structured_result", updateId: id, intent });
      throw new Error("Emergency publishUpdate attempted to return without a structured result");
    }
    if (emergency) emergencySendDebug({ stage: "publish_returning", updateId: id, resultPresent: Boolean(result.result), resultKind: result.result?.kind ?? null, uniqueRecipientCount: result.result?.uniqueRecipientCount ?? null, queuedDeliveryCount: result.result?.queuedDeliveryCount ?? null });
    return result;
  } catch (error) {
    if (emergency) emergencySendDebug({ stage: "publish_returning", updateId: id, resultPresent: false, resultKind: null, uniqueRecipientCount: null, queuedDeliveryCount: null, errorCode: error instanceof PublicationError ? error.code : "thrown" });
    throw error;
  }
}

export async function scheduleUpdate(id: string, _: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const intentCandidate = String(data.get("broadcast_intent") ?? "");
  const intent = broadcastIntents.includes(intentCandidate as BroadcastIntent) ? intentCandidate as BroadcastIntent : "new_video";
  const scheduledDate = String(data.get("scheduled_date") ?? "");
  const scheduledTime = String(data.get("scheduled_time") ?? "");
  const localValue = String(data.get("scheduled_for_local") ?? "");
  const timeZone = String(data.get("time_zone") ?? "");
  const isoValue = String(data.get("scheduled_for_iso") ?? "");
  scheduleDebug({ stage: "schedule_entered", updateId: id, intent });
  scheduleDebug({ stage: "schedule_input", hasScheduledDate: Boolean(scheduledDate), hasScheduledTime: Boolean(scheduledTime), hasScheduledForLocal: Boolean(localValue), hasScheduledForIso: Boolean(isoValue), hasTimeZone: Boolean(timeZone), timeZone, scheduledDate, scheduledTime, scheduledForLocal: localValue, scheduledForIso: isoValue });
  if (!localValue) {
    const result = {
      error: "Choose a valid date and time.",
      errors: { scheduled_for_local: ["Choose both a schedule date and time."] },
    };
    scheduleDebug({ stage: "schedule_validation", valid: false, errorFields: ["scheduled_for_local"] });
    scheduleDebug({ stage: "schedule_returning", resultPresent: false, resultKind: null, hasError: true, scheduledFor: null, redirecting: false });
    return result;
  }
  const scheduledFor = validateScheduleInput({ localValue, timeZone, isoValue });
  if (!scheduledFor) {
    const result = {
      error: "Choose a valid date and time in your displayed time zone.",
      errors: { scheduled_for_local: ["This local date and time is invalid. Check daylight-saving changes and try again."] },
    };
    scheduleDebug({ stage: "schedule_validation", valid: false, errorFields: ["scheduled_for_local"] });
    scheduleDebug({ stage: "schedule_returning", resultPresent: false, resultKind: null, hasError: true, scheduledFor: null, redirecting: false });
    return result;
  }
  if (new Date(scheduledFor).getTime() < Date.now() + 60_000) {
    const result = {
      error: "Choose a time at least one minute from now.",
      errors: { scheduled_for_local: ["Choose a time at least one minute from now."] },
    };
    scheduleDebug({ stage: "schedule_validation", valid: false, errorFields: ["scheduled_for_local"], scheduledForUtc: scheduledFor, isFuture: new Date(scheduledFor).getTime() > Date.now() });
    scheduleDebug({ stage: "schedule_returning", resultPresent: false, resultKind: null, hasError: true, scheduledFor, redirecting: false });
    return result;
  }
  scheduleDebug({ stage: "schedule_validation", valid: true, errorFields: [], scheduledForUtc: scheduledFor, isFuture: true });
  const result = await commitPublication(id, data, scheduledFor, timeZone);
  scheduleDebug({ stage: "schedule_returning", resultPresent: Boolean(result.result), resultKind: result.result?.kind ?? null, hasError: Boolean(result.error), scheduledFor, redirecting: false });
  return result;
}

export async function cancelScheduledUpdate(id: string, previousState: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  void previousState;
  void data;
  if (!z.string().uuid().safeParse(id).success) return mutationError("This scheduled update is unavailable.");
  const creator = await requireCreator();
  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  const { data: result, error } = await supabase.rpc("cancel_scheduled_update", {
    p_update_id: id,
    p_creator_id: creator.id,
  });
  if (error || !result) return mutationError("This scheduled update can no longer be cancelled.");
  revalidatePath("/dashboard/updates");
  revalidatePath(`/dashboard/updates/${id}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/updates/${id}`);
}
