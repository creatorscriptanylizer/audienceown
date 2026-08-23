import "server-only";

import { getIntentDefinition, type BroadcastIntent } from "@/lib/broadcast-studio";
import { createAdminClient } from "@/lib/supabase/admin";
import { recoveryMethodTypeToTransport, type DeliveryTransport } from "@/lib/update-recipients";
import { canonicalAccountConnected, resolveConnectionStatus } from "@/lib/social-providers/connection-health";

export type EmergencyAudienceAccount = { accountId:string;provider:string;displayName:string;role:"main"|"recovery";optedInFollowerCount:number };
export type CommunicationAudienceResolution = {accounts:EmergencyAudienceAccount[];uniqueEligible:number;channelBreakdown:Record<DeliveryTransport,number>;eligibleConnectionIds:Set<string>;eligibleContactIds:Set<string>;zeroAudience:boolean;category:string;mandatory:boolean};
export class CommunicationAudienceError extends Error { constructor(public readonly code:"invalid_accounts"|"audience_unavailable"){super(code);} }
const emptyBreakdown=():Record<DeliveryTransport,number>=>({email:0,sms:0,whatsapp:0,browser_notification:0});

function usableTransport(method:{method_type:string;method_status:string;provider_identifier:string|null},contact:{email_ciphertext:string|null;phone_ciphertext:string|null}){
  if(method.method_status!=="verified")return null;
  const transport=recoveryMethodTypeToTransport(method.method_type);if(!transport)return null;
  const usable=transport==="email"?Boolean(contact.email_ciphertext):transport==="sms"||transport==="whatsapp"?Boolean(contact.phone_ciphertext):Boolean(method.provider_identifier);
  return usable?transport:null;
}

async function resolveEmergencyAudience(creatorId:string,intent:BroadcastIntent,accountIds:string[]):Promise<CommunicationAudienceResolution>{
  const db=createAdminClient();if(!db)throw new CommunicationAudienceError("audience_unavailable");
  const uniqueIds=[...new Set(accountIds)];if(!uniqueIds.length||uniqueIds.length!==accountIds.length)throw new CommunicationAudienceError("invalid_accounts");
  const{data:accounts,error:accountError}=await db.from("connected_accounts").select("id,platform,account_type,label,external_account_name").eq("creator_id",creatorId).in("id",uniqueIds);
  if(accountError)throw new CommunicationAudienceError("audience_unavailable");if((accounts??[]).length!==uniqueIds.length)throw new CommunicationAudienceError("invalid_accounts");
  const official=(accounts??[]).filter(account=>account.account_type==="official"),recoveries=(accounts??[]).filter(account=>account.account_type==="backup");
  if(official.length!==1||official.length+recoveries.length!==uniqueIds.length)throw new CommunicationAudienceError("invalid_accounts");
  if(recoveries.length){const{data:network,error}=await db.from("recovery_networks").select("recovery_network_destinations(recovery_connected_account_id)").eq("creator_id",creatorId).eq("main_connected_account_id",official[0].id).maybeSingle();if(error)throw new CommunicationAudienceError("audience_unavailable");const linked=new Set((network?.recovery_network_destinations??[]).map(row=>row.recovery_connected_account_id));if(recoveries.some(account=>!linked.has(account.id)))throw new CommunicationAudienceError("invalid_accounts");}
  const{data:connections,error:connectionError}=await db.from("follower_connections").select("id,follower_contact_id,selected_recovery_method_id").eq("creator_id",creatorId).eq("status","active");if(connectionError)throw new CommunicationAudienceError("audience_unavailable");
  const connectionIds=(connections??[]).map(row=>row.id),contactIds=[...new Set((connections??[]).map(row=>row.follower_contact_id))],recoveryIds=recoveries.map(account=>account.id);
  const[mainMemberships,recoveryPreferences,categoryPreferences,methodsResult,contactsResult]=await Promise.all([
    connectionIds.length?db.from("follower_connection_account_memberships").select("follower_connection_id,connected_account_id").eq("creator_id",creatorId).in("follower_connection_id",connectionIds).eq("connected_account_id",official[0].id):Promise.resolve({data:[],error:null}),
    connectionIds.length&&recoveryIds.length?db.from("follower_recovery_destination_preferences").select("follower_connection_id,connected_account_id").eq("creator_id",creatorId).eq("status","active").in("follower_connection_id",connectionIds).in("connected_account_id",recoveryIds):Promise.resolve({data:[],error:null}),
    connectionIds.length?db.from("follower_category_preferences").select("follower_connection_id").in("follower_connection_id",connectionIds).eq("category_key","recovery").eq("enabled",true):Promise.resolve({data:[],error:null}),
    contactIds.length?db.from("follower_recovery_methods").select("id,follower_contact_id,method_type,method_status,provider_identifier").in("follower_contact_id",contactIds):Promise.resolve({data:[],error:null}),
    contactIds.length?db.from("follower_contacts").select("id,email_ciphertext,phone_ciphertext").in("id",contactIds):Promise.resolve({data:[],error:null}),
  ]);if(mainMemberships.error||recoveryPreferences.error||categoryPreferences.error||methodsResult.error||contactsResult.error)throw new CommunicationAudienceError("audience_unavailable");
  const optedInByAccount=new Map<string,Set<string>>(uniqueIds.map(id=>[id,new Set()]));for(const row of mainMemberships.data??[])optedInByAccount.get(row.connected_account_id)?.add(row.follower_connection_id);for(const row of recoveryPreferences.data??[]){if(row.connected_account_id)optedInByAccount.get(row.connected_account_id)?.add(row.follower_connection_id);}
  const optedInConnections=new Set([...optedInByAccount.values()].flatMap(ids=>[...ids])),recoveryConsent=new Set((categoryPreferences.data??[]).map(row=>row.follower_connection_id)),methods=new Map((methodsResult.data??[]).map(method=>[method.id,method])),contacts=new Map((contactsResult.data??[]).map(contact=>[contact.id,contact]));
  const eligibleConnectionIds=new Set<string>(),eligibleContactIds=new Set<string>(),transportByContact=new Map<string,DeliveryTransport>();
  for(const connection of connections??[]){if(!optedInConnections.has(connection.id)||!recoveryConsent.has(connection.id)||!connection.selected_recovery_method_id)continue;const method=methods.get(connection.selected_recovery_method_id),contact=contacts.get(connection.follower_contact_id);if(!method||!contact||method.follower_contact_id!==connection.follower_contact_id)continue;const transport=usableTransport(method,contact);if(!transport||eligibleContactIds.has(connection.follower_contact_id))continue;eligibleConnectionIds.add(connection.id);eligibleContactIds.add(connection.follower_contact_id);transportByContact.set(connection.follower_contact_id,transport);}
  const perAccountContacts=new Map<string,Set<string>>(uniqueIds.map(id=>[id,new Set()])),connectionById=new Map((connections??[]).map(connection=>[connection.id,connection]));for(const[accountId,ids]of optedInByAccount)for(const connectionId of ids){const connection=connectionById.get(connectionId);if(connection&&eligibleContactIds.has(connection.follower_contact_id))perAccountContacts.get(accountId)?.add(connection.follower_contact_id);}
  const accountById=new Map((accounts??[]).map(account=>[account.id,account]));const summaries=uniqueIds.map(id=>{const account=accountById.get(id)!;return{accountId:id,provider:account.platform,displayName:account.external_account_name??account.label,role:account.account_type==="official"?"main"as const:"recovery"as const,optedInFollowerCount:perAccountContacts.get(id)?.size??0};});
  const channelBreakdown=emptyBreakdown();for(const transport of transportByContact.values())channelBreakdown[transport]+=1;
  return{accounts:summaries,uniqueEligible:eligibleContactIds.size,channelBreakdown,eligibleConnectionIds,eligibleContactIds,zeroAudience:eligibleContactIds.size===0,category:getIntentDefinition(intent).category,mandatory:true};
}

export async function resolveCommunicationAudiencePreview(creatorId:string,intent:BroadcastIntent,accountIds:string[]=[]):Promise<CommunicationAudienceResolution>{
  const definition=getIntentDefinition(intent);if(definition.mandatory)return resolveEmergencyAudience(creatorId,intent,accountIds);
  const db=createAdminClient();if(!db)throw new CommunicationAudienceError("audience_unavailable");
  const uniqueIds=[...new Set(accountIds)];if(uniqueIds.length!==accountIds.length)throw new CommunicationAudienceError("invalid_accounts");
  let accountQuery=db.from("connected_accounts").select("id,platform,account_type,label,external_account_name,url,external_account_id,connection_health,provider_status").eq("creator_id",creatorId).in("account_type",["official","backup"]);
  if(uniqueIds.length)accountQuery=accountQuery.in("id",uniqueIds);
  const{data:accounts,error:accountError}=await accountQuery;if(accountError)throw new CommunicationAudienceError("audience_unavailable");
  if(uniqueIds.length&&(accounts??[]).length!==uniqueIds.length)throw new CommunicationAudienceError("invalid_accounts");
  if((accounts??[]).some(account=>{const connected=canonicalAccountConnected({health:account.connection_health,providerStatus:account.provider_status,hasPublicUrl:Boolean(account.url),hasExternalAccountId:Boolean(account.external_account_id)});return!connected||resolveConnectionStatus({health:account.connection_health,providerStatus:account.provider_status,canonicalConnected:connected}).actionRequired;}))throw new CommunicationAudienceError("invalid_accounts");
  const scopedIds=uniqueIds.length?uniqueIds:(accounts??[]).map(account=>account.id),mainIds=(accounts??[]).filter(account=>account.account_type==="official").map(account=>account.id),recoveryIds=(accounts??[]).filter(account=>account.account_type==="backup").map(account=>account.id);
  const{data:connections,error}=await db.from("follower_connections").select("id,follower_contact_id").eq("creator_id",creatorId).eq("status","active");if(error)throw new CommunicationAudienceError("audience_unavailable");const connectionIds=(connections??[]).map(row=>row.id),contactIds=[...new Set((connections??[]).map(row=>row.follower_contact_id))];
  const[preferences,methods,contacts,mainMemberships,recoveryPreferences]=await Promise.all([
    connectionIds.length?db.from("follower_category_preferences").select("follower_connection_id").in("follower_connection_id",connectionIds).eq("category_key",definition.category).eq("enabled",true):Promise.resolve({data:[],error:null}),
    contactIds.length?db.from("follower_recovery_methods").select("follower_contact_id").in("follower_contact_id",contactIds).eq("method_type","email").eq("method_status","verified"):Promise.resolve({data:[],error:null}),
    contactIds.length?db.from("follower_contacts").select("id,email_ciphertext").in("id",contactIds):Promise.resolve({data:[],error:null}),
    connectionIds.length&&mainIds.length?db.from("follower_connection_account_memberships").select("follower_connection_id,connected_account_id").eq("creator_id",creatorId).in("follower_connection_id",connectionIds).in("connected_account_id",mainIds):Promise.resolve({data:[],error:null}),
    connectionIds.length&&recoveryIds.length?db.from("follower_recovery_destination_preferences").select("follower_connection_id,connected_account_id").eq("creator_id",creatorId).eq("status","active").in("follower_connection_id",connectionIds).in("connected_account_id",recoveryIds):Promise.resolve({data:[],error:null}),
  ]);if(preferences.error||methods.error||contacts.error||mainMemberships.error||recoveryPreferences.error)throw new CommunicationAudienceError("audience_unavailable");
  const memberships=new Map<string,Set<string>>(scopedIds.map(id=>[id,new Set()]));for(const row of mainMemberships.data??[])memberships.get(row.connected_account_id)?.add(row.follower_connection_id);for(const row of recoveryPreferences.data??[]){if(row.connected_account_id)memberships.get(row.connected_account_id)?.add(row.follower_connection_id);}
  const scopedConnections=new Set([...memberships.values()].flatMap(ids=>[...ids])),preferred=new Set((preferences.data??[]).map(row=>row.follower_connection_id)),verified=new Set((methods.data??[]).map(row=>row.follower_contact_id)),deliverable=new Set((contacts.data??[]).filter(row=>row.email_ciphertext).map(row=>row.id)),eligibleContactIds=new Set<string>(),eligibleConnectionIds=new Set<string>();
  for(const connection of connections??[]){if(!scopedConnections.has(connection.id)||!preferred.has(connection.id)||!verified.has(connection.follower_contact_id)||!deliverable.has(connection.follower_contact_id)||eligibleContactIds.has(connection.follower_contact_id))continue;eligibleContactIds.add(connection.follower_contact_id);eligibleConnectionIds.add(connection.id);}
  const connectionById=new Map((connections??[]).map(connection=>[connection.id,connection])),perAccountContacts=new Map<string,Set<string>>(scopedIds.map(id=>[id,new Set()]));for(const[accountId,ids]of memberships)for(const connectionId of ids){const connection=connectionById.get(connectionId);if(connection&&preferred.has(connectionId)&&verified.has(connection.follower_contact_id)&&deliverable.has(connection.follower_contact_id))perAccountContacts.get(accountId)?.add(connection.follower_contact_id);}
  const accountById=new Map((accounts??[]).map(account=>[account.id,account])),summaries=scopedIds.map(id=>{const account=accountById.get(id)!;return{accountId:id,provider:account.platform,displayName:account.external_account_name??account.label,role:account.account_type==="official"?"main"as const:"recovery"as const,optedInFollowerCount:perAccountContacts.get(id)?.size??0};});
  return{accounts:summaries,uniqueEligible:eligibleContactIds.size,channelBreakdown:{...emptyBreakdown(),email:eligibleContactIds.size},eligibleConnectionIds,eligibleContactIds,zeroAudience:eligibleContactIds.size===0,category:definition.category,mandatory:false};
}
