import "server-only";
import { decryptContact, requireContactEncryptionKey } from "@/lib/contact-encryption";
import { createAdminClient } from "@/lib/supabase/admin";

const normalize=(value:string)=>value.trim().toLocaleLowerCase();
export type AudiencePrivateSearchResult={matchedFollowerContactIds:Set<string>;mode:"none"|"email"|"email_local_part"};

/** Creator-scoped private matching. Plaintext destinations never leave this server-only boundary. */
export async function resolvePrivateAudienceMatches(creatorId:string,rawQuery:string):Promise<AudiencePrivateSearchResult>{
  const query=normalize(rawQuery);if(!query)return{matchedFollowerContactIds:new Set(),mode:"none"};
  const mode=query.includes("@")?"email" as const:"email_local_part" as const,admin=createAdminClient();
  const{data:connections,error:connectionError}=await admin.from("follower_connections").select("follower_contact_id").eq("creator_id",creatorId).eq("status","active");
  if(connectionError)throw connectionError;
  const candidateIds=[...new Set((connections??[]).map(row=>row.follower_contact_id))];
  if(!candidateIds.length)return{matchedFollowerContactIds:new Set(),mode};
  const{data:contacts,error:contactError}=await admin.from("follower_contacts").select("id,email_ciphertext").in("id",candidateIds);
  if(contactError)throw contactError;
  const secret=requireContactEncryptionKey(),matchedFollowerContactIds=new Set<string>();
  await Promise.all((contacts??[]).map(async contact=>{if(!contact.email_ciphertext)return;const email=normalize(await decryptContact(contact.email_ciphertext,secret)??"");if(!email)return;const matches=mode==="email"?email===query:email.split("@",1)[0]===query;if(matches)matchedFollowerContactIds.add(contact.id);}));
  return{matchedFollowerContactIds,mode};
}
