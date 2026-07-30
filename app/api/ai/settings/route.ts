import{getCreator}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";import{aiSettingsSchema}from"@/lib/ai/schemas";
import{aiConfiguration,modelBackedAiAvailable}from"@/lib/ai/configuration";
export async function GET(){const creator=await getCreator();if(!creator)return Response.json({error:"Unauthorized"},{status:401});const client=await createClient();
const[{data:settings},{data:usage}]=await Promise.all([client!.from("creator_ai_settings").select("*").eq("creator_id",creator.id).maybeSingle(),client!.rpc("get_ai_usage_summary")]);
return Response.json({settings:settings??{creator_id:creator.id,enabled:false,provider:"openai",preferred_model:aiConfiguration().model,preferred_variant:"standard",
tone:"natural",audience_description:"",preferred_terminology:"",phrases_to_avoid:"",cta_style:"",custom_voice_instructions:"",
include_emojis:false,include_hashtags:false,preserve_source_title:true,approval_required:true,ai_auto_send_enabled:false,ai_required:false,
monthly_generation_limit:Number(process.env.AI_DEFAULT_CREATOR_MONTHLY_LIMIT??50),monthly_budget_minor_units:Number(process.env.AI_DEFAULT_CREATOR_BUDGET_MINOR_UNITS??1000)},
usage,modelConfigured:modelBackedAiAvailable(),fallback:"Deterministic variants remain available when model enhancement is unavailable."},{headers:{"cache-control":"private, no-store"}});}
export async function PUT(request:Request){const creator=await getCreator();if(!creator)return Response.json({error:"Unauthorized"},{status:401});let input:unknown;
try{input=await request.json();}catch{return Response.json({error:"Invalid JSON"},{status:400});}const parsed=aiSettingsSchema.safeParse(input);
if(!parsed.success)return Response.json({error:"Invalid AI settings",fields:parsed.error.flatten().fieldErrors},{status:400});const client=await createClient();
const{data,error}=await client!.from("creator_ai_settings").upsert({creator_id:creator.id,provider:"openai",...parsed.data}).select("*").single();
return error?Response.json({error:"Settings could not be saved"},{status:500}):Response.json({settings:data});}
