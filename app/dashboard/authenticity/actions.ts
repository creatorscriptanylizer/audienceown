"use server";
import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { PresentationState } from "@/components/authenticity/verified-identity-controls";

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

export async function saveVerifiedIdentityPresentation(_:PresentationState,data:FormData):Promise<PresentationState>{
  const creator=await requireCreator();
  const db=await createClient();if(!db)return{error:"Public profile couldn't be saved."};
  const title=String(data.get("title")??"").trim(),summary=String(data.get("summary")??"").trim();
  if(title.length>100||summary.length>280)return{error:"Public profile couldn't be saved."};
  const{error}=await db.rpc("update_creator_authenticity_profile",{p_display_enabled:true,p_embed_enabled:true,p_qr_enabled:true,p_show_verified_timestamps:data.get("timestamps")==="on",p_show_relationship_history:data.get("history")==="on",p_public_title:title,p_public_summary:summary});
  if(error)return{error:"Public profile couldn't be saved."};
  const saved=await db.from("creator_authenticity_profiles").select("public_title,public_summary").eq("creator_id",creator.id).maybeSingle();
  if(saved.error||(saved.data?.public_title??"")!==title||(saved.data?.public_summary??"")!==summary)return{error:"Public profile couldn't be saved."};
  revalidatePath("/dashboard/authenticity");
  revalidatePath(`/verify/${creator.public_slug}`);
  revalidatePath(`/c/${creator.public_slug}`);
  revalidatePath(`/${creator.public_slug}`);
  return{success:"Saved"};
}

export async function requestAssertionRefresh() {
  const db = await createClient();
  if (!db) throw new Error("Database unavailable");
  const { error } = await db.rpc("request_authenticity_assertion_refresh");
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/authenticity");
}
