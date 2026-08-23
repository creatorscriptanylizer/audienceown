"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireCreator } from "@/lib/dal";
import { debugDatabaseError, debugLog } from "@/lib/debug";
import { createClient } from "@/lib/supabase/server";
import { creatorSchema } from "@/lib/validation";

export type RecoveryPassState = { error?: string; success?: boolean; url?: string };
type DatabaseError = { code?: string; message?: string; details?: string; hint?: string };

function recoveryPassStep(step: string, metadata: Record<string, unknown> = {}) {
  debugLog("database", { event: "recovery_pass_create", step, ...metadata });
}

export async function createRecoveryPass(_: RecoveryPassState, formData: FormData): Promise<RecoveryPassState> {
  recoveryPassStep("start");
  const creator = await requireCreator();
  recoveryPassStep("auth_resolved", { userId: creator.owner_user_id, creatorId: creator.id });
  const parsed = creatorSchema.safeParse({ display_name: formData.get("display_name"), public_slug: formData.get("public_slug"), public_bio: "" });
  if (!parsed.success) {
    recoveryPassStep("input_rejected", { issue: parsed.error.issues[0]?.message });
    return { error: parsed.error.issues[0]?.message ?? "Check your Recovery Pass." };
  }
  recoveryPassStep("input_validated", { slug: parsed.data.public_slug });
  const db = await createClient();
  if (!db) {
    debugDatabaseError("create", "create_recovery_pass", new Error("Supabase client unavailable"), { step: "client_create" });
    return { error: "Recovery Pass could not be created." };
  }
  const { data: availability, error: availabilityError } = await db.rpc("check_recovery_pass_name_availability" as never, { p_slug: parsed.data.public_slug } as never) as unknown as { data: string | null; error: DatabaseError | null };
  if (availabilityError || availability !== "available") {
    if (availabilityError) debugDatabaseError("rpc", "check_recovery_pass_name_availability", availabilityError, { step: "uniqueness_check", slug: parsed.data.public_slug });
    return { error: availability === "taken" ? "That creator name was just taken. Choose another one." : "Availability could not be verified. Try again." };
  }
  recoveryPassStep("uniqueness_checked", { slug: parsed.data.public_slug, result: "available" });
  recoveryPassStep("persistence_start", { rpc: "create_recovery_pass" });
  const { error } = await db.rpc("create_recovery_pass" as never, { p_display_name: parsed.data.display_name, p_slug: parsed.data.public_slug } as never) as unknown as { error: DatabaseError | null };
  if (error) {
    debugDatabaseError("rpc", "create_recovery_pass", error, { step: "persistence", slug: parsed.data.public_slug });
    return { error: error.code === "23505" ? "That creator name was just taken. Choose another one." : "Recovery Pass could not be created." };
  }
  recoveryPassStep("persistence_complete", { slug: parsed.data.public_slug });
  recoveryPassStep("onboarding_advanced", { creatorId: creator.id });
  revalidatePath("/onboarding");
  revalidatePath(`/c/${parsed.data.public_slug}`);
  revalidatePath(`/${parsed.data.public_slug}`);
  recoveryPassStep("complete", { slug: parsed.data.public_slug });
  return { success: true, url: `/${parsed.data.public_slug}` };
}

export async function completeAccountStep(formData: FormData) { const { creator } = await import("@/lib/onboarding").then(module => module.requireOnboarding()); const step = z.enum(["official", "backup"]).parse(formData.get("step")), db = await createClient(); if (!db) throw new Error("Onboarding progress could not be saved."); const field = step === "official" ? "official_step_completed_at" : "backup_step_completed_at", result = await db.from("creator_onboarding" as never).update({ [field]: new Date().toISOString() } as never).eq("creator_id", creator.id); if (result.error) throw new Error("Onboarding progress could not be saved."); redirect(step === "official" ? "/onboarding/accounts?step=backup" : "/onboarding/ready"); }
export async function completeOnboarding(formData: FormData) { const creator = await requireCreator(), destination = z.enum(["dashboard", "recovery-pass"]).catch("dashboard").parse(formData.get("destination")), db = await createClient(); if (!db) throw new Error("Onboarding progress could not be saved."); const result = await db.from("creator_onboarding" as never).update({ completed_at: new Date().toISOString() } as never).eq("creator_id", creator.id); if (result.error) throw new Error("Onboarding progress could not be saved."); revalidatePath("/dashboard", "layout"); const store=await cookies(),proInterval=store.get("audienceown_post_onboarding_pro")?.value;store.delete("audienceown_post_onboarding_pro");if(proInterval==="monthly"||proInterval==="yearly")redirect(`/dashboard/settings/plans?checkout=${proInterval}`);redirect(destination === "recovery-pass" ? "/dashboard/creator-page" : "/dashboard"); }
