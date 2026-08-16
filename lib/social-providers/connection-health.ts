export type ConnectionHealthState="healthy"|"syncing"|"action_required"|"temporarily_unavailable"|"disconnected"|"manual";
export function canonicalAccountConnected(input:{health?:string|null;providerStatus?:string|null;hasPublicUrl?:boolean;hasExternalAccountId?:boolean}){
  if(input.health==="revoked"||input.health==="expired"||input.providerStatus==="revoked")return false;
  if(input.providerStatus==="configuration_pending"&&input.hasPublicUrl&&!input.hasExternalAccountId)return true;
  return input.health!=="disconnected";
}
export function connectionHealthState(input:{externalAccountId?:string|null;health?:string|null;leaseExpiresAt?:string|null;failureCategory?:string|null},now=Date.now()):ConnectionHealthState{
  if(!input.externalAccountId)return"manual";
  if(input.leaseExpiresAt&&Date.parse(input.leaseExpiresAt)>now)return"syncing";
  if(input.health==="healthy")return"healthy";
  if(input.health==="expired"||input.health==="revoked")return"action_required";
  if(input.health==="degraded"&&["rate_limit","temporary_provider","network"].includes(input.failureCategory??""))return"temporarily_unavailable";
  if(input.health==="disconnected")return"disconnected";
  return"action_required";
}
export const connectionHealthLabels:Record<ConnectionHealthState,string>={healthy:"Healthy",syncing:"Syncing",action_required:"Action required",temporarily_unavailable:"Temporarily unavailable",disconnected:"Disconnected",manual:"Manual"};
export const connectionHealthDescriptions:Record<ConnectionHealthState,string>={
  healthy:"Synchronization is working normally.",
  syncing:"AudienceOwn is updating this account now.",
  action_required:"Reconnect this account to restore synchronization.",
  temporarily_unavailable:"The platform is temporarily unavailable. AudienceOwn will retry automatically.",
  disconnected:"Synchronization and authorized access are stopped.",
  manual:"This public URL is saved without live synchronization.",
};
export function isProviderDataStale(updatedAt:string|null|undefined,now=Date.now(),thresholdMs=2*60*60_000){return Boolean(updatedAt&&now-Date.parse(updatedAt)>thresholdMs);}
export function relativeProviderUpdate(updatedAt:string|null|undefined,now=Date.now()){
  if(!updatedAt)return"Not synchronized yet";const elapsed=Math.max(0,now-Date.parse(updatedAt)),minutes=Math.floor(elapsed/60_000);
  if(minutes<1)return"Last synced just now";if(minutes<60)return`Last synced ${minutes} minute${minutes===1?"":"s"} ago`;
  const hours=Math.floor(minutes/60);if(hours<24)return`Last synced ${hours} hour${hours===1?"":"s"} ago`;
  if(hours<48)return"Last synced yesterday";
  const days=Math.floor(hours/24);return`Last synced ${days} days ago`;
}

export type ConnectionStatusTone="success"|"warning"|"danger"|"neutral";
export type CapabilityResponsibility="none"|"creator"|"provider_or_developer"|"informational";
export type ResolvedConnectionStatus={connectionLabel:string;connectionTone:ConnectionStatusTone;actionRequired:boolean;capabilityNotice:string|null;capabilityStatus:string;capabilityResponsibility:CapabilityResponsibility};
const capabilityStates:Record<string,{actionRequired:boolean;notice:string|null;responsibility:CapabilityResponsibility}>={
  ready:{actionRequired:false,notice:null,responsibility:"none"},configuration_pending:{actionRequired:false,notice:"Some features are still being configured.",responsibility:"provider_or_developer"},
  provider_review_required:{actionRequired:false,notice:"Some features are awaiting provider approval.",responsibility:"provider_or_developer"},provider_plan_required:{actionRequired:false,notice:"Automatic features are unavailable on the current provider plan.",responsibility:"provider_or_developer"},
  automatic_detection_unavailable:{actionRequired:false,notice:"Automatic detection is unavailable; manual updates remain available.",responsibility:"informational"},missing_approved_scope:{actionRequired:false,notice:"Some automatic features are awaiting approved provider access.",responsibility:"provider_or_developer"},
  app_review_required:{actionRequired:false,notice:"Some features are awaiting provider approval.",responsibility:"provider_or_developer"},asset_selection_required:{actionRequired:true,notice:"Choose the account or page you want to connect.",responsibility:"creator"},
  public_invite_required:{actionRequired:true,notice:"Add a public invite so people can find this account.",responsibility:"creator"},public_url_required:{actionRequired:true,notice:"Add the public profile URL for this account.",responsibility:"creator"},reconnect_required:{actionRequired:true,notice:"Reconnect this account to restore access.",responsibility:"creator"},
};
/** Resolves connection health separately from provider capability and creator action. */
export function resolveConnectionStatus(input:{health?:string|null;providerStatus?:string|null;canonicalConnected?:boolean}):ResolvedConnectionStatus{
  const health=input.health??"healthy",capabilityStatus=input.providerStatus??"ready",capability=capabilityStates[capabilityStatus]??{actionRequired:false,notice:"Some provider features are currently limited.",responsibility:"informational" as const};
  if(health==="revoked"||health==="expired")return{connectionLabel:"Connection lost",connectionTone:"danger",actionRequired:true,capabilityNotice:capability.notice,capabilityStatus,capabilityResponsibility:capability.responsibility};
  if(health==="disconnected"&&input.canonicalConnected!==true)return{connectionLabel:"Disconnected",connectionTone:"danger",actionRequired:true,capabilityNotice:capability.notice,capabilityStatus,capabilityResponsibility:capability.responsibility};
  if(health==="reconnect_required"||capabilityStatus==="reconnect_required")return{connectionLabel:"Reconnect required",connectionTone:"warning",actionRequired:true,capabilityNotice:capability.notice,capabilityStatus,capabilityResponsibility:"creator"};
  if(health==="degraded")return{connectionLabel:"Needs attention",connectionTone:"warning",actionRequired:capability.actionRequired,capabilityNotice:capability.notice,capabilityStatus,capabilityResponsibility:capability.responsibility};
  if(capability.actionRequired)return{connectionLabel:"Action required",connectionTone:"warning",actionRequired:true,capabilityNotice:capability.notice,capabilityStatus,capabilityResponsibility:capability.responsibility};
  return{connectionLabel:"Connected",connectionTone:"success",actionRequired:false,capabilityNotice:capability.notice,capabilityStatus,capabilityResponsibility:capability.responsibility};
}

export function providerAuthorizationLabel(health:ConnectionHealthState,providerStatus?:string|null){
  if(providerStatus==="revocation_pending"||providerStatus==="cleanup_pending")return"Pending cleanup";
  if(health==="action_required"||health==="disconnected")return"Reconnect required";
  if(health==="manual")return"No authorization";
  return"Authorization active";
}
