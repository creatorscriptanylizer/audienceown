import {z}from"zod";import {draftVariantTypes,type DraftVariantType}from"./types";
const clean=(max:number)=>z.string().min(1).max(max).refine((v)=>!/[<>]|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v),"Unsafe control characters or HTML.");
export const enhancedVariantSchema=z.object({variantType:z.enum(draftVariantTypes),title:clean(160),body:clean(20000),
callToAction:z.string().max(120).nullable(),sourceUrl:z.string().url().startsWith("https://").nullable()}).strict();
export const enhancedOutputSchema=z.object({variants:z.array(enhancedVariantSchema).min(1).max(7)}).strict();
export function validateEnhancedOutput(value:unknown,requested:DraftVariantType[],canonicalUrl:string|null){
 const parsed=enhancedOutputSchema.parse(value);const types=parsed.variants.map((v)=>v.variantType);
 if(new Set(types).size!==types.length)throw new Error("duplicate_variants");
 for(const type of requested)if(!types.includes(type))throw new Error("missing_variant");
 for(const variant of parsed.variants){if(variant.sourceUrl!==canonicalUrl)throw new Error("source_url_mismatch");
  if(/\[[^\]]+\]\((?!https:\/\/)/.test(variant.body)||/javascript:|data:|file:/i.test(variant.body))throw new Error("unsafe_link");}
 return parsed.variants;
}
export const aiSettingsSchema=z.object({enabled:z.boolean(),preferred_model:z.string().min(1).max(80),preferred_variant:z.enum(draftVariantTypes),
tone:z.enum(["natural","energetic","professional","conversational","concise","educational"]),audience_description:z.string().max(500),
preferred_terminology:z.string().max(500),phrases_to_avoid:z.string().max(500),cta_style:z.string().max(300),
custom_voice_instructions:z.string().max(1500),include_emojis:z.boolean(),include_hashtags:z.boolean(),preserve_source_title:z.boolean(),
approval_required:z.boolean(),ai_auto_send_enabled:z.boolean(),ai_required:z.boolean(),monthly_generation_limit:z.number().int().min(0).max(10000),
monthly_budget_minor_units:z.number().int().min(0).max(10000000)}).strict();
