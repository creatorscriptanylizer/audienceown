import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseAuthenticityRecord, getPublicVerificationUrl } from "@/lib/authenticity/public";
import { getPublicRecoveryPassUrl } from "@/lib/canonical-public-url";
import { loadPublicVerifiedIdentity } from "@/lib/public-verified-identity";
import { creatorVerificationSummary, resolveCreatorVerification } from "@/lib/creator-verification";

type Creator=Database["public"]["Tables"]["creators"]["Row"];
export type VerifiedIdentityAccount={id:string;provider:string;displayName:string;url:string;role:"main"|"recovery";verificationStatus:string;publicEligible:boolean;mainAccountId:string|null};
export type IdentityStrength="Strong"|"Good"|"Needs attention"|"Incomplete";
export function scopeRecoveryNetworks(accounts:VerifiedIdentityAccount[]){const mains=accounts.filter(account=>account.role==="main"),recoveries=accounts.filter(account=>account.role==="recovery");return mains.map(main=>({main,recoveryAccounts:recoveries.filter(recovery=>recovery.mainAccountId===main.id&&recovery.publicEligible)}));}
export function calculateIdentityStrength(input:{accountCount:number;verified:boolean;attention:boolean;allMainVerified:boolean;allRecoveryVerified:boolean;publicPage:boolean;recoveryPass:boolean}):IdentityStrength{return!input.accountCount?"Incomplete":input.attention?"Needs attention":input.verified&&input.allMainVerified&&input.allRecoveryVerified&&input.publicPage&&input.recoveryPass?"Strong":input.verified?"Good":"Incomplete"}

export async function getVerifiedIdentityDashboardData(db:SupabaseClient<Database>,creator:Creator){
  const slug=creator.public_slug??"";
  const [profileResult,publicResult,connectionsResult,identitiesResult,networkResult]=await Promise.all([
    db.from("creator_authenticity_profiles").select("display_enabled,public_title,public_summary,show_verified_timestamps,show_relationship_history").eq("creator_id",creator.id).maybeSingle(),
    db.rpc("get_public_creator_authenticity",{p_slug:slug}),
    db.from("connected_accounts").select("id,platform,account_type,label,url,external_account_name,external_account_url,is_public,connection_health,provider_status,protected_official_account_id").eq("creator_id",creator.id).order("position"),
    db.from("creator_identity_accounts").select("source_connection_id,verification_status,public_visible,official,display_name,display_handle,canonical_profile_url").eq("creator_id",creator.id),
    db.from("main_account_recovery_destinations").select("main_connected_account_id,recovery_connected_account_id").eq("creator_id",creator.id),
  ]);
  if(profileResult.error||publicResult.error||connectionsResult.error||identitiesResult.error||networkResult.error)throw new Error("verified_identity_load_failed");
  const profile=profileResult.data,record=parseAuthenticityRecord(publicResult.data),identityByConnection=new Map((identitiesResult.data??[]).filter(row=>row.source_connection_id).map(row=>[row.source_connection_id!,row]));
  const mainByRecovery=new Map((networkResult.data??[]).map(row=>[row.recovery_connected_account_id,row.main_connected_account_id]));
  const accounts:VerifiedIdentityAccount[]=(connectionsResult.data??[]).map(connection=>{const identity=identityByConnection.get(connection.id),role=connection.account_type==="official"?"main" as const:"recovery" as const;return{id:connection.id,provider:connection.platform,displayName:identity?.display_name??identity?.display_handle??connection.external_account_name??connection.label,url:identity?.canonical_profile_url??connection.external_account_url??connection.url,role,verificationStatus:identity?.verification_status??(connection.provider_status==="ready"?"pending":"not_connected"),publicEligible:Boolean(identity?.verification_status==="verified"&&identity.official&&identity.public_visible&&connection.is_public),mainAccountId:role==="recovery"?(mainByRecovery.get(connection.id)??connection.protected_official_account_id??null):null};});
  const mainAccounts=accounts.filter(account=>account.role==="main"),recoveryAccounts=accounts.filter(account=>account.role==="recovery"),creatorVerification=resolveCreatorVerification(connectionsResult.data??[],identitiesResult.data??[]);
  const publicState=record?.authenticity.state??"identity_unverified",verified=creatorVerification.verified,attention=accounts.some(account=>["needs_attention","revoked","failed"].includes(account.verificationStatus));
  const identityStrength=calculateIdentityStrength({accountCount:accounts.length,verified,attention,allMainVerified:mainAccounts.every(a=>a.verificationStatus==="verified"),allRecoveryVerified:recoveryAccounts.every(a=>a.verificationStatus==="verified"),publicPage:Boolean(profile?.display_enabled&&record),recoveryPass:creator.recovery_pass_enabled});
  const verificationUrl=getPublicVerificationUrl(slug),publicIdentity=record?await loadPublicVerifiedIdentity(db,creator,record):null;
  return{creator:{displayName:creator.display_name,slug,avatar:creator.profile_image_path},creatorVerification,verification:{state:publicState,label:verified?"Verified by AudienceOwn":"Verification pending",summary:creatorVerificationSummary(creator.display_name,creatorVerification),verified,attention},accounts,mainAccounts,recoveryAccounts,recoveryNetworks:scopeRecoveryNetworks(accounts),publicVerification:{url:verificationUrl,record,published:Boolean(profile?.display_enabled&&record)},publicPresentation:{title:profile?.public_title??"",summary:profile?.public_summary??"",showVerificationDates:profile?.show_verified_timestamps??false,showContinuityHistory:profile?.show_relationship_history??false},verificationHealth:{officialVerified:mainAccounts.filter(a=>a.verificationStatus==="verified").length,officialTotal:mainAccounts.length,recoveryVerified:recoveryAccounts.filter(a=>a.verificationStatus==="verified").length,recoveryTotal:recoveryAccounts.length,publicPage:Boolean(profile?.display_enabled&&record),recoveryPass:creator.recovery_pass_enabled},identityStrength,recoveryPassUrl:getPublicRecoveryPassUrl(slug),activeEmergencyState:record?.emergency??null,publicIdentity};
}
