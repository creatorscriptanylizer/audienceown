"use server";
import { revalidatePath } from "next/cache";
import { announcementSchema } from "@/lib/validation";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "./creator";

export async function saveAnnouncement(_: FormState, data: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = announcementSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = (await createClient())!;
  const { error } = await supabase.from("creators").update({
    announcement_title: parsed.data.title,
    announcement_body: parsed.data.body,
    announcement_cta_label: parsed.data.cta_label || null,
    announcement_cta_url: parsed.data.cta_url || null,
    announcement_published_at: new Date().toISOString(),
  }).eq("owner_user_id", creator.owner_user_id);
  if (error) return { error: "Announcement could not be published." };
  revalidatePath("/dashboard");
  revalidatePath(`/c/${creator.public_slug}`);
  return { success: "Current announcement published." };
}

export async function removeAnnouncement() {
  const creator = await requireCreator();
  const supabase = (await createClient())!;
  await supabase.from("creators").update({
    announcement_title: null, announcement_body: null, announcement_cta_label: null,
    announcement_cta_url: null, announcement_published_at: null,
  }).eq("owner_user_id", creator.owner_user_id);
  revalidatePath("/dashboard");
  revalidatePath(`/c/${creator.public_slug}`);
}
