import { createHash } from "node:crypto";import { getCreator } from "@/lib/dal";import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";import { getSocialProvider } from "@/lib/social-providers/registry";
import { isSocialProvider,providerHosts } from "@/lib/social-providers/normalize";
import { requireSameOrigin } from "@/lib/emergency/request-security";
export async function POST(request:Request,{params}:{params:Promise<{provider:string}>}){const{provider}=await params;
  if(!requireSameOrigin(request))return Response.json({error:"Cross-origin request rejected"},{status:403});
  if(!isSocialProvider(provider))return Response.json({error:"Unknown provider"},{status:404});const adapter=getSocialProvider(provider);
  if(!adapter.capabilities.manualImport)return Response.json({error:"provider_capability_not_supported"},{status:409});const creator=await getCreator();
  if(!creator)return Response.json({error:"Unauthorized"},{status:401});let body:{url?:unknown;title?:unknown;thumbnailUrl?:unknown};
  try{body=await request.json() as {url?:unknown;title?:unknown;thumbnailUrl?:unknown;sourcePublishedAt?:unknown};}catch{return Response.json({error:"Invalid JSON"},{status:400});}
  const url=String(body.url??""),title=String(body.title??"").trim(),thumbnail=String(body.thumbnailUrl??"");
  const sourcePublishedAt=String((body as {sourcePublishedAt?:unknown}).sourcePublishedAt??"");let parsed:URL;
  try{parsed=new URL(url);}catch{return Response.json({error:"Invalid provider URL"},{status:400});}
  if(parsed.protocol!=="https:"||!providerHosts[provider].some((host)=>parsed.hostname===host||parsed.hostname.endsWith(`.${host}`))||!title||!Number.isFinite(Date.parse(sourcePublishedAt)))
    return Response.json({error:"Provider URL, title, and publication time are required"},{status:400});
  if(thumbnail){try{if(new URL(thumbnail).protocol!=="https:")throw new Error();}catch{return Response.json({error:"Invalid thumbnail URL"},{status:400});}}
  const client=await createClient();let{data:connection}=await client!.from("connected_accounts").select("id").eq("creator_id",creator.id).eq("platform",provider).limit(1).maybeSingle();
  if(!connection){const inserted=await client!.from("connected_accounts").insert({creator_id:creator.id,platform:provider,account_type:"official",
      label:`${adapter.displayName} manual imports`,url:`https://${providerHosts[provider][0]}`,is_primary:false,is_public:false,
      provider_status:"automatic_detection_unavailable"}).select("id").single();connection=inserted.data;}
  if(!connection)return Response.json({error:"Connection unavailable"},{status:500});const admin=createAdminClient();if(!admin)return Response.json({error:"Not configured"},{status:503});
  const externalId=`manual:${createHash("sha256").update(url).digest("hex")}`;const ingested=await admin.rpc("ingest_social_detection",{p_connection_id:connection.id,p_provider:provider,
    p_external_object_id:externalId,p_external_event_id:"",p_object_type:"post",p_event_type:"published",p_source_payload:{title,canonical_url:url,thumbnail_url:thumbnail||null},
    p_source_published_at:sourcePublishedAt,p_detection_source:"manual_provider_import"});if(ingested.error)return Response.json({error:"Import failed"},{status:500});
  const draft=await admin.rpc("create_social_draft",{p_event_id:(ingested.data as{event_id:string}).event_id});if(draft.error)return Response.json({error:"Draft failed"},{status:500});
  return Response.json({status:"draft_ready",updateId:(draft.data as{update_id:string}).update_id},{status:201});}
