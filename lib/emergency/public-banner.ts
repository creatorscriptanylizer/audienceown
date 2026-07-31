import type{CreatorRecord}from"@/lib/public-creators";
export type PublicEmergency={emergency_type:string;severity:string;title:string;message:string;updated_at:string;
affected:{provider:string;display_handle:string;canonical_profile_url:string}|null;
replacement:{provider:string;display_handle:string;canonical_profile_url:string;verified_at:string|null}|null};
export function applyPublicEmergency(creator:CreatorRecord,emergency:PublicEmergency|null):CreatorRecord{
if(!emergency)return{...creator,emergencyMode:false};
const platform=emergency.affected?.provider??"Account";const route=emergency.replacement?{primary:{label:"Verified official backup",
handle:emergency.replacement.display_handle,url:emergency.replacement.canonical_profile_url}}:undefined;
return{...creator,emergencyMode:true,affectedPlatform:platform,statusMessage:emergency.message,lastVerifiedAt:emergency.updated_at,
recoveryRoutes:route?{...creator.recoveryRoutes,[platform.toLowerCase()]:route}:creator.recoveryRoutes,
officialLinks:creator.officialLinks.map(link=>link.platform.toLowerCase()===platform.toLowerCase()?{...link,label:`Affected — ${link.label}`}:link)};}

