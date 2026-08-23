"use server";

import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { creatorProfileSettingsSchema, type CreatorProfileSettingsState } from "@/lib/creator-profile-settings";

export async function updateRecoveryPassProfile(_: CreatorProfileSettingsState, formData: FormData): Promise<CreatorProfileSettingsState> {
  const creator = await requireCreator();
  const allowed = new Set(["display_name", "public_tagline", "public_bio"]);
  const unknown = [...formData.keys()].filter((key) => !key.startsWith("$ACTION_") && !allowed.has(key));
  if (unknown.length) return { status: "error", message: "The submitted profile contained unsupported fields." };
  const parsed = creatorProfileSettingsSchema.safeParse({
    display_name: formData.get("display_name"),
    public_tagline: formData.get("public_tagline"),
    public_bio: formData.get("public_bio"),
  });
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const db = await createClient();
  if (!db) return { status: "error", message: "Changes could not be saved. Try again." };
  const result = await db.from("creators").update(parsed.data as never).eq("id", creator.id).eq("owner_user_id", creator.owner_user_id).select("recovery_pass_name,display_name,public_slug,public_tagline,public_bio").single() as unknown as { data: { recovery_pass_name: string; display_name: string; public_slug: string | null; public_tagline: string | null; public_bio: string | null } | null; error: unknown };
  if (result.error || !result.data?.public_slug) return { status: "error", message: "Changes could not be saved. Try again." };
  const saved = { recoveryPassName: result.data.recovery_pass_name, displayName: result.data.display_name, slug: result.data.public_slug, tagline: result.data.public_tagline, biography: result.data.public_bio };
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard/creator-page");
  revalidatePath(`/${saved.slug}`);
  revalidatePath(`/c/${saved.slug}`);
  revalidatePath(`/verify/${saved.slug}`);
  revalidatePath("/dashboard/authenticity");
  return { status: "success", message: "Profile updated. Your changes are now reflected across AudienceOwn.", saved };
}
