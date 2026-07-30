import{getCreator}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";
export async function POST(request:Request,{params}:{params:Promise<{updateId:string}>}){const{updateId}=await params;if(!await getCreator())return Response.json({error:"Unauthorized"},{status:401});
let variantId="";try{variantId=String((await request.json()as{variantId?:unknown}).variantId??"");}catch{return Response.json({error:"Invalid JSON"},{status:400});}
const client=await createClient();const{data,error}=await client!.rpc("select_ai_draft_variant",{p_update_id:updateId,p_variant_id:variantId});
return error?Response.json({error:"Variant could not be selected"},{status:400}):Response.json(data);}
