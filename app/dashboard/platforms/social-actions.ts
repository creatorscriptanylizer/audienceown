"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCreator } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { decryptSocialSecret } from "@/lib/social-secrets";
import { revalidateCreatorAccounts } from "@/lib/social-providers/creator-account-revalidation";

const idSchema = z.string().uuid();

export async function updateYouTubeAutomation(formData: FormData) {
  const creator = await requireCreator();
  const id = idSchema.parse(formData.get("connection_id"));
  const watchEnabled = formData.get("watch_enabled") === "on";
  const autoCreateDrafts = formData.get("auto_create_drafts") === "on";
  const autoSend = formData.get("auto_send") === "on";
  if (autoSend && (!watchEnabled || !autoCreateDrafts || formData.get("confirm_auto_send") !== "yes")) {
    redirect("/dashboard/platforms?youtube=confirm_auto_send");
  }
  const client = await createClient();
  const { error } = await client!.from("connected_accounts").update({
    watch_enabled: watchEnabled, auto_create_drafts: autoCreateDrafts, auto_send: autoSend,
  }).eq("id", id).eq("creator_id", creator.id).eq("platform", "youtube");
  if (error) redirect("/dashboard/platforms?youtube=save_failed");
  revalidateCreatorAccounts(creator.id);
  redirect("/dashboard/platforms?youtube=saved");
}

export async function disconnectYouTube(formData: FormData) {
  const creator = await requireCreator();
  const id = idSchema.parse(formData.get("connection_id"));
  const client = await createClient();
  const { data } = await client!.from("connected_accounts").update({
    watch_enabled: false, auto_send: false, connection_health: "disconnected",
    last_connection_error: null, token_expires_at: null,
  }).eq("id", id).eq("creator_id", creator.id).eq("platform", "youtube").select("id").maybeSingle();
  if (!data) redirect("/dashboard/platforms?youtube=disconnect_failed");
  const admin = createAdminClient();
  const { data: secret } = admin
    ? await admin.from("platform_connection_secrets").select("access_token_ciphertext").eq("platform_connection_id", id).maybeSingle()
    : { data: null };
  if (secret) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decryptSocialSecret(secret.access_token_ciphertext) }),
        cache: "no-store",
      });
    } catch {
      // Local credential deletion still guarantees that AudienceOwn cannot make more API calls.
    }
  }
  await admin?.from("platform_connection_secrets").delete().eq("platform_connection_id", id);
  revalidateCreatorAccounts(creator.id);
  redirect("/dashboard/platforms?youtube=disconnected");
}
