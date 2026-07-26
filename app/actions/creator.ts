"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creatorSchema, slugSchema, socialAccountSchema } from "@/lib/validation";
import { getPlatform, normalizePlatformAccount, type PlatformId } from "@/lib/platforms";
import { requireCreator, requireViewer } from "@/lib/dal";

export type FormState = { error?: string; success?: string };
export type PlatformSaveState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  savedPlatform?: PlatformId;
};

async function slugIsTaken(slug: string, excludedCreatorId?: string) {
  const supabase = createAdminClient();
  if (!supabase) return null;
  let query = supabase.from("creators").select("id").eq("public_slug", slug);
  if (excludedCreatorId) query = query.neq("id", excludedCreatorId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) return null;
  return Boolean(data);
}

export async function createCreator(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireViewer();
  const parsed = creatorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your profile details." };
  const taken = await slugIsTaken(parsed.data.public_slug);
  if (taken === true) return { error: "That URL is already taken." };
  if (taken === null) return { error: "URL availability could not be verified. Try again." };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.from("creators").upsert(
    { owner_user_id: user.id, ...parsed.data },
    { onConflict: "owner_user_id" },
  );
  if (error?.code === "23505") return { error: "That URL was just claimed. Choose another." };
  if (error) return { error: "Your creator page could not be created." };
  redirect("/dashboard");
}

export async function checkHandle(slug: string) {
  await requireViewer();
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return {
    available: false as const,
    reason: "invalid" as const,
    message: parsed.error.issues[0]?.message ?? "Invalid URL",
  };
  const taken = await slugIsTaken(parsed.data);
  if (taken === null) return {
    available: false as const,
    reason: "invalid" as const,
    message: "Availability could not be checked",
  };
  return {
    available: !taken,
    reason: taken ? "taken" as const : "available" as const,
    message: taken ? "Already taken" : "Available",
  };
}

export async function updateCreator(_: FormState, formData: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = creatorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your changes." };
  if (parsed.data.public_slug !== creator.public_slug) {
    const taken = await slugIsTaken(parsed.data.public_slug, creator.id);
    if (taken === true) return { error: "That URL is already taken." };
    if (taken === null) return { error: "URL availability could not be verified. Try again." };
  }
  const supabase = await createClient();
  const { error } = await supabase!.from("creators").update(parsed.data)
    .eq("owner_user_id", creator.owner_user_id);
  if (error?.code === "23505") return { error: "That URL is already claimed." };
  if (error) return { error: "Changes could not be saved." };
  revalidatePath("/dashboard/creator-page");
  revalidatePath(`/c/${parsed.data.public_slug}`);
  return { success: "Creator page saved." };
}

export async function setPublication(_: FormState, formData: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const enabled = z.enum(["true", "false"]).safeParse(formData.get("enabled"));
  if (!enabled.success) return { error: "Invalid publication state." };
  if (enabled.data === "true" && (!creator.profile_image_path || !creator.public_bio))
    return { error: "Add a profile image and biography before publishing." };
  const supabase = await createClient();
  const { error } = await supabase!.from("creators").update({ public_profile_enabled: enabled.data === "true" })
    .eq("owner_user_id", creator.owner_user_id);
  if (error) return { error: "Publication status could not be changed." };
  revalidatePath("/dashboard");
  revalidatePath(`/c/${creator.public_slug}`);
  return { success: enabled.data === "true" ? "Your page is live." : "Your page is now private." };
}

export async function addSocial(_: FormState, formData: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = socialAccountSchema.safeParse({
    platform: formData.get("platform"), label: formData.get("label"), url: formData.get("url"),
    account_type: formData.get("account_type"), is_public: formData.get("is_public") === "true",
    is_primary: formData.get("is_primary") === "true", position: Number(formData.get("position") ?? 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the account." };
  const supabase = await createClient();
  if (parsed.data.is_primary) {
    await supabase!.from("connected_accounts").update({ is_primary: false })
      .eq("creator_id", creator.id).eq("account_type", parsed.data.account_type);
  }
  const { error } = await supabase!.from("connected_accounts").insert({ creator_id: creator.id, ...parsed.data });
  if (error) return { error: "Account could not be added." };
  revalidatePath("/dashboard/platforms");
  return { success: "Account added." };
}

export async function deleteSocial(formData: FormData) {
  const creator = await requireCreator();
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase!.from("connected_accounts").delete().eq("id", id).eq("creator_id", creator.id);
  revalidatePath("/dashboard/platforms");
}

const platformAccountInput = z.object({
  id: z.string().uuid().optional(),
  platformId: z.string(),
  value: z.string().trim().min(1),
  label: z.string().trim().max(60).optional(),
  isPublic: z.boolean(),
});
const platformGroupInput = z.object({
  official: platformAccountInput,
  backups: z.array(platformAccountInput).max(50),
});

export async function savePlatformGroup(_: PlatformSaveState, formData: FormData): Promise<PlatformSaveState> {
  const creator = await requireCreator();
  const payload = formData.get("payload");
  if (typeof payload !== "string") return { error: "Your changes could not be read." };
  let raw: unknown;
  try { raw = JSON.parse(payload); } catch { return { error: "Your changes could not be read." }; }
  const parsed = platformGroupInput.safeParse(raw);
  if (!parsed.success) return { error: "Check the highlighted account details." };
  const platform = getPlatform(parsed.data.official.platformId);
  if (!platform) return { error: "Choose a supported platform.", fieldErrors: { official: "Choose a supported platform." } };

  const fieldErrors: Record<string, string> = {};
  const official = normalizePlatformAccount(platform.id, parsed.data.official.value);
  if ("error" in official) fieldErrors.official = official.error;
  const backupPlatforms = parsed.data.backups.map((backup, index) => {
    const definition = getPlatform(backup.platformId);
    if (!definition) fieldErrors[`backup-${index}`] = "Choose a supported platform.";
    return definition;
  });
  const backups = parsed.data.backups.map((backup, index) => {
    const definition = backupPlatforms[index];
    const normalized = definition
      ? normalizePlatformAccount(definition.id, backup.value)
      : { error: "Choose a supported platform." };
    if ("error" in normalized) fieldErrors[`backup-${index}`] = normalized.error;
    return normalized;
  });
  const validUrls = [
    ...("url" in official ? [official.url] : []),
    ...backups.flatMap((backup) => "url" in backup ? [backup.url] : []),
  ];
  const duplicate = validUrls.find((url, index) => validUrls.indexOf(url) !== index);
  if (duplicate) {
    const duplicateIndex = backups.findIndex((backup) => "url" in backup && backup.url === duplicate);
    fieldErrors[duplicateIndex >= 0 ? `backup-${duplicateIndex}` : "official"] = "Each account must use a different URL.";
  }
  if (Object.keys(fieldErrors).length || !("url" in official))
    return { error: "Check the highlighted account details.", fieldErrors };

  const supabase = (await createClient())!;
  const { data: ownedAccounts, error: loadError } = await supabase.from("connected_accounts").select("*").eq("creator_id", creator.id);
  if (loadError) return { error: "Your existing accounts could not be verified. Try again." };
  const currentAccounts = ownedAccounts ?? [];
  const currentIds = new Set(currentAccounts.map((account) => account.id));
  const submittedIds = [parsed.data.official.id, ...parsed.data.backups.map((backup) => backup.id)].filter(Boolean) as string[];
  if (submittedIds.some((id) => !currentIds.has(id)))
    return { error: "One of these accounts no longer belongs to you. Refresh and try again." };

  // The Stage 1 unique index permits one primary official account per creator.
  // The currently edited platform becomes primary; every row still retains its official/backup type.
  const { error: primaryError } = await supabase.from("connected_accounts").update({ is_primary: false })
    .eq("creator_id", creator.id).eq("account_type", "official");
  if (primaryError) return { error: "Your official account could not be prepared for saving." };

  const rows = [
    {
      input: parsed.data.official, normalized: official, definition: platform, account_type: "official",
      is_primary: true, position: 0,
    },
    ...parsed.data.backups.map((input, index) => ({
      input, normalized: backups[index], definition: backupPlatforms[index]!, account_type: "backup",
      is_primary: false, position: index + 1,
    })),
  ] as const;
  for (const row of rows) {
    if (!row.normalized || !("url" in row.normalized)) continue;
    const values = {
      creator_id: creator.id,
      platform: row.definition.databaseValue,
      account_type: row.account_type,
      label: row.input.label?.trim() || row.normalized.label,
      url: row.normalized.url,
      is_primary: row.is_primary,
      is_public: row.input.isPublic,
      position: row.position,
    };
    const query = row.input.id
      ? supabase.from("connected_accounts").update(values).eq("id", row.input.id).eq("creator_id", creator.id)
      : supabase.from("connected_accounts").insert(values);
    const { error } = await query;
    if (error) return { error: "Some changes could not be saved. Review this platform and try again." };
  }
  const keepIds = new Set(submittedIds);
  // Stage 1 stores creator-level accounts as flat rows, so saving replaces the
  // creator's official account and backup set without inventing a group relation.
  const removeIds = currentAccounts.filter((account) =>
    (account.account_type === "official" || account.account_type === "backup") && !keepIds.has(account.id),
  ).map((account) => account.id);
  if (removeIds.length) {
    const { error } = await supabase.from("connected_accounts").delete().eq("creator_id", creator.id).in("id", removeIds);
    if (error) return { error: "Accounts were saved, but removed backups could not be deleted. Try again." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/platforms");
  revalidatePath(`/c/${creator.public_slug}`);
  return { success: `${platform.name} saved.`, savedPlatform: platform.id };
}

export async function uploadCreatorImage(formData: FormData) {
  const creator = await requireCreator();
  const user = await requireViewer();
  const kind = z.enum(["profile", "banner"]).parse(formData.get("kind"));
  const file = formData.get("file");
  if (!(file instanceof File)) return;
  const limits = { profile: 5_242_880, banner: 10_485_760 };
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const ext = extensions[file.type];
  if (!ext || file.size > limits[kind]) return;
  const supabase = await createClient();
  const path = `${user.id}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase!.storage.from("creator-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return;
  const old = kind === "profile" ? creator.profile_image_path : creator.banner_image_path;
  await supabase!.from("creators").update(kind === "profile" ? { profile_image_path: path } : { banner_image_path: path })
    .eq("owner_user_id", user.id);
  if (old?.startsWith(`${user.id}/`)) await supabase!.storage.from("creator-media").remove([old]);
  revalidatePath("/dashboard/creator-page");
}
