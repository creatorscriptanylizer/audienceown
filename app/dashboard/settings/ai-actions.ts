"use server";import{revalidatePath}from"next/cache";import{requireCreator}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";import{aiSettingsSchema}from"@/lib/ai/schemas";
export async function saveAiSettings(formData:FormData){const creator=await requireCreator();const values={enabled:formData.get("enabled")==="on",
preferred_model:String(formData.get("preferred_model")??"gpt-4o-mini"),preferred_variant:String(formData.get("preferred_variant")??"standard"),
tone:String(formData.get("tone")??"natural"),audience_description:String(formData.get("audience_description")??""),
preferred_terminology:String(formData.get("preferred_terminology")??""),phrases_to_avoid:String(formData.get("phrases_to_avoid")??""),
cta_style:String(formData.get("cta_style")??""),custom_voice_instructions:String(formData.get("custom_voice_instructions")??""),
include_emojis:formData.get("include_emojis")==="on",include_hashtags:formData.get("include_hashtags")==="on",
preserve_source_title:formData.get("preserve_source_title")==="on",approval_required:formData.get("approval_required")==="on",
ai_auto_send_enabled:formData.get("ai_auto_send_enabled")==="on",ai_required:formData.get("ai_required")==="on",
monthly_generation_limit:Number(formData.get("monthly_generation_limit")??50),monthly_budget_minor_units:Number(formData.get("monthly_budget_minor_units")??1000)};
const parsed=aiSettingsSchema.safeParse(values);if(!parsed.success)return;const client=await createClient();await client!.from("creator_ai_settings").upsert({creator_id:creator.id,provider:"openai",...parsed.data});
revalidatePath("/dashboard/settings");}
