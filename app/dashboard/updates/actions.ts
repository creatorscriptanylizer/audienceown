"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { isFutureSchedule, updateDraftSchema, updatePublishSchema } from "@/lib/updates";
import { PublicationError, publishDeliveryQueue } from "@/lib/update-delivery";
import { broadcastIntents, getIntentDefinition, type BroadcastIntent } from "@/lib/broadcast-studio";
import { z } from "zod";

export type UpdateActionState = {
  error?: string;
  errors?: Record<string, string[]>;
};

function valuesFrom(data: FormData) {
  const intentCandidate = String(data.get("broadcast_intent") ?? "");
  const intent = broadcastIntents.includes(intentCandidate as BroadcastIntent)
    ? intentCandidate as BroadcastIntent
    : "new_video";
  return {
    broadcast_intent: intent,
    affected_platform_connection_id: String(data.get("affected_platform_connection_id") ?? "") || null,
    broadcast_type: getIntentDefinition(intent).broadcastType,
    title: data.get("title"),
    subject: data.get("subject"),
    preview_text: data.get("preview_text"),
    content: data.get("content"),
    cta_label: data.get("cta_label"),
    cta_url: data.get("cta_url"),
  };
}

async function validateTarget(
  creatorId: string,
  values: ReturnType<typeof valuesFrom>,
): Promise<UpdateActionState | null> {
  const definition = getIntentDefinition(values.broadcast_intent);
  if (definition.platform === "required" && !values.affected_platform_connection_id) {
    return { error: "Select the affected platform.", errors: { affected_platform_connection_id: ["Select the affected platform."] } };
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

export async function createDraft(_: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const creator = await requireCreator();
  const values = valuesFrom(data);
  const targetError = await validateTarget(creator.id, values);
  if (targetError) return targetError;
  const parsed = updateDraftSchema.safeParse(values);
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  const { data: update, error } = await supabase.from("creator_updates").insert({
    creator_id: creator.id,
    ...parsed.data,
    broadcast_intent: values.broadcast_intent,
    affected_platform_connection_id: values.affected_platform_connection_id,
    cta_label: parsed.data.cta_label || null,
    cta_url: parsed.data.cta_url || null,
  }).select("id").single();

  if (error || !update) return mutationError("The draft could not be created.");
  revalidatePath("/dashboard/updates");
  redirect(`/dashboard/updates/${update.id}`);
}

export async function updateDraft(id: string, _: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const creator = await requireCreator();
  const values = valuesFrom(data);
  const targetError = await validateTarget(creator.id, values);
  if (targetError) return targetError;
  const parsed = updateDraftSchema.safeParse(values);
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
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
  }).eq("id", id).eq("creator_id", creator.id).in("status", ["draft", "cancelled"]).select("id").maybeSingle();

  if (error || !update) return mutationError("Only your draft or cancelled updates can be edited.");
  revalidatePath("/dashboard/updates");
  revalidatePath(`/dashboard/updates/${id}`);
  redirect(`/dashboard/updates/${id}`);
}

export async function deleteDraft(id: string, previousState: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  void previousState;
  void data;
  const creator = await requireCreator();
  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  const { data: deleted, error } = await supabase.from("creator_updates")
    .delete().eq("id", id).eq("creator_id", creator.id).eq("status", "draft").select("id").maybeSingle();

  if (error || !deleted) return mutationError("Only your draft updates can be deleted.");
  revalidatePath("/dashboard/updates");
  redirect("/dashboard/updates");
}

export async function scheduleUpdate(id: string, _: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const creator = await requireCreator();
  const values = valuesFrom(data);
  const targetError = await validateTarget(creator.id, values);
  if (targetError) return targetError;
  const parsed = updatePublishSchema.safeParse(values);
  if (!parsed.success) return validationState(parsed.error);

  const scheduledValue = String(data.get("scheduled_for") ?? "");
  if (!isFutureSchedule(scheduledValue)) {
    return { error: "Choose a date and time in the future.", errors: { scheduled_for: ["Choose a date and time in the future."] } };
  }
  const scheduledFor = new Date(scheduledValue).toISOString();

  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
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
    status: "scheduled",
    scheduled_for: scheduledFor,
    cancelled_at: null,
  }).eq("id", id).eq("creator_id", creator.id).in("status", ["draft", "cancelled"]).select("id").maybeSingle();

  if (error || !update) return mutationError("This update could not be scheduled.");
  revalidatePath("/dashboard/updates");
  revalidatePath(`/dashboard/updates/${id}`);
  redirect(`/dashboard/updates/${id}`);
}

export async function publishUpdate(id: string, _: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return mutationError("This broadcast is unavailable.");
  const creator = await requireCreator();
  const values = valuesFrom(data);
  const targetError = await validateTarget(creator.id, values);
  if (targetError) return targetError;
  const parsed = updatePublishSchema.safeParse(values);
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  if (!supabase) return mutationError("Broadcast publishing is unavailable.");
  const { data: current } = await supabase.from("creator_updates").select("status")
    .eq("id", id).eq("creator_id", creator.id).maybeSingle();
  if (!current || !["draft", "cancelled", "queued"].includes(current.status)) {
    return mutationError("Only an editable or already queued broadcast can be published.");
  }
  if (current.status !== "queued") {
    const { data: saved, error } = await supabase.from("creator_updates").update({
      ...parsed.data,
      broadcast_intent: values.broadcast_intent,
      affected_platform_connection_id: values.affected_platform_connection_id,
      cta_label: parsed.data.cta_label || null,
      cta_url: parsed.data.cta_url || null,
    }).eq("id", id).eq("creator_id", creator.id).in("status", ["draft", "cancelled"]).select("id").maybeSingle();
    if (error || !saved) return mutationError("Only an editable draft can be published.");
  }

  let summary;
  try {
    summary = await publishDeliveryQueue(id, creator.id);
  } catch (error) {
    if (error instanceof PublicationError && error.code === "zero_audience") {
      return mutationError("No eligible followers can receive this update yet. Your draft is saved and nothing was queued.");
    }
    if (error instanceof PublicationError && error.code === "preparation_failed") {
      return mutationError("The draft was saved, but its recipients could not be prepared. Nothing was queued.");
    }
    return mutationError("The draft was saved, but publication could not be completed. Nothing was queued.");
  }
  const query = new URLSearchParams({
    status: summary.status,
    updateId: summary.updateId,
    queued: String(summary.queued),
    eligible: String(summary.eligible),
    duplicates: String(summary.duplicates),
    excluded: String(summary.excluded),
    ...Object.fromEntries(Object.entries(summary.byTransport).map(([key, value]) => [key, String(value)])),
  });
  revalidatePath("/dashboard/updates");
  revalidatePath(`/dashboard/updates/${id}`);
  redirect(`/dashboard/updates/${id}?${query}`);
}

export async function cancelScheduledUpdate(id: string, previousState: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  void previousState;
  void data;
  const creator = await requireCreator();
  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  const { data: update, error } = await supabase.from("creator_updates").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
  }).eq("id", id).eq("creator_id", creator.id).eq("status", "scheduled").select("id").maybeSingle();

  if (error || !update) return mutationError("Only a scheduled update can be cancelled.");
  revalidatePath("/dashboard/updates");
  revalidatePath(`/dashboard/updates/${id}`);
  redirect(`/dashboard/updates/${id}`);
}
