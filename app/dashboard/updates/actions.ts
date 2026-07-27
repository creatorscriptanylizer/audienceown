"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { isFutureSchedule, updateDraftSchema, updatePublishSchema } from "@/lib/updates";

export type UpdateActionState = {
  error?: string;
  errors?: Record<string, string[]>;
};

function valuesFrom(data: FormData) {
  return {
    broadcast_type: data.get("broadcast_type"),
    title: data.get("title"),
    subject: data.get("subject"),
    preview_text: data.get("preview_text"),
    content: data.get("content"),
    cta_label: data.get("cta_label"),
    cta_url: data.get("cta_url"),
  };
}

function validationState(error: { flatten(): { fieldErrors: Record<string, string[]> } }): UpdateActionState {
  return { error: "Check the highlighted fields.", errors: error.flatten().fieldErrors };
}

function mutationError(message: string): UpdateActionState {
  return { error: message };
}

export async function createDraft(_: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const creator = await requireCreator();
  const parsed = updateDraftSchema.safeParse(valuesFrom(data));
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  const { data: update, error } = await supabase.from("creator_updates").insert({
    creator_id: creator.id,
    ...parsed.data,
    cta_label: parsed.data.cta_label || null,
    cta_url: parsed.data.cta_url || null,
  }).select("id").single();

  if (error || !update) return mutationError("The draft could not be created.");
  revalidatePath("/dashboard/updates");
  redirect(`/dashboard/updates/${update.id}`);
}

export async function updateDraft(id: string, _: UpdateActionState, data: FormData): Promise<UpdateActionState> {
  const creator = await requireCreator();
  const parsed = updateDraftSchema.safeParse(valuesFrom(data));
  if (!parsed.success) return validationState(parsed.error);

  const supabase = await createClient();
  if (!supabase) return mutationError("Updates are unavailable until Supabase is configured.");
  const { data: update, error } = await supabase.from("creator_updates").update({
    broadcast_type: parsed.data.broadcast_type,
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
  const parsed = updatePublishSchema.safeParse(valuesFrom(data));
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
