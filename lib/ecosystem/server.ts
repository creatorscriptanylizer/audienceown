import"server-only";import{createAdminClient}from"@/lib/supabase/admin";import{parsePublicEcosystemGraph}from"./public";
export async function getPublicEcosystem(slug:string){const db=createAdminClient();if(!db)return null;const{data,error}=await db.rpc("get_public_creator_ecosystem_graph",{p_slug:slug});if(error)return null;return parsePublicEcosystemGraph(data);}

