"use server";
import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export async function setupAuthenticity() {
  await requireCreator();
  const db = await createClient();
  if (!db) throw new Error("Database unavailable");
  const { error: identityError } = await db.rpc("ensure_creator_identity_profile");
  if (identityError) throw new Error(identityError.message);
  const { error: authenticityError } = await db.rpc("ensure_creator_authenticity_profile");
  if (authenticityError) throw new Error(authenticityError.message);
  revalidatePath("/dashboard/authenticity");
}

export async function saveAuthenticitySettings(data: FormData) {
  const db = await createClient();
  if (!db) throw new Error("Database unavailable");
  const enabled = (name: string) => data.get(name) === "on";
  const { error } = await db.rpc("update_creator_authenticity_profile", {
    p_display_enabled: enabled("display"),
    p_embed_enabled: enabled("embed"),
    p_qr_enabled: enabled("qr"),
    p_show_verified_timestamps: enabled("timestamps"),
    p_show_relationship_history: enabled("history"),
    p_public_title: String(data.get("title") ?? "") || undefined,
    p_public_summary: String(data.get("summary") ?? "") || undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/authenticity");
  revalidatePath("/verify/[slug]", "page");
}

export async function requestAssertionRefresh() {
  const db = await createClient();
  if (!db) throw new Error("Database unavailable");
  const { error } = await db.rpc("request_authenticity_assertion_refresh");
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/authenticity");
}
