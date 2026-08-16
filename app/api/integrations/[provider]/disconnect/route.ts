import {z} from "zod";
import {getCreator} from "@/lib/dal";
import {createAdminClient} from "@/lib/supabase/admin";
import {isSocialProvider} from "@/lib/social-providers/normalize";
import {getSocialProvider} from "@/lib/social-providers/registry";
import {decryptSocialSecret} from "@/lib/social-secrets";
import {removeCreatorConnectedAccount} from "@/lib/connected-account-removal";
import {revalidateCreatorAccounts} from "@/lib/social-providers/creator-account-revalidation";
import {requireSameOrigin} from "@/lib/emergency/request-security";

const schema=z.object({connectionId:z.string().uuid()}).strict();
export async function POST(request:Request,{params}:{params:Promise<{provider:string}>}){
  if(!requireSameOrigin(request))return Response.json({error:"Cross-origin request rejected"},{status:403});
  const{provider}=await params;if(!isSocialProvider(provider)||!["instagram","facebook","tiktok","x","linkedin","pinterest","twitch","spotify","discord","snapchat"].includes(provider))return Response.json({error:"Unknown provider"},{status:404});
  const creator=await getCreator(),db=createAdminClient();if(!creator||!db)return Response.json({error:"Unauthorized"},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid connection"},{status:400});
  const[{data:connection},{data:secret}]=await Promise.all([db.from("connected_accounts").select("id,platform").eq("id",parsed.data.connectionId).eq("creator_id",creator.id).eq("platform",provider).maybeSingle(),db.from("platform_connection_secrets").select("access_token_ciphertext,refresh_token_ciphertext").eq("platform_connection_id",parsed.data.connectionId).maybeSingle()]);
  if(!connection)return Response.json({error:"Not found"},{status:404});
  if(secret){const adapter=getSocialProvider(provider);if(adapter.capabilities.tokenRevocation&&adapter.revokeConnection)try{await adapter.revokeConnection({accessToken:decryptSocialSecret(secret.access_token_ciphertext),refreshToken:secret.refresh_token_ciphertext?decryptSocialSecret(secret.refresh_token_ciphertext):undefined});}catch{/* Local full removal remains authoritative when provider revocation is unavailable. */}}
  await removeCreatorConnectedAccount(db,creator.id,connection.id);revalidateCreatorAccounts(creator.id);return Response.json({status:"disconnected"});
}
