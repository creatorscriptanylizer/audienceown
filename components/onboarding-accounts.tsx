"use client";
import{Check,ChevronRight,ShieldCheck}from"lucide-react";
import{completeAccountStep}from"@/app/onboarding/actions";
import{PlatformBrandIcon}from"@/components/dashboard/platform-brand-icon";
import{providerPickerState}from"@/components/platforms-manager";
import{PLATFORMS}from"@/lib/platforms";
import type{CreatorEntitlements}from"@/lib/provider-entitlements";
import type{CreatorProviderAccount}from"@/lib/social-providers/creator-account-projection";
import type{ProviderConnectionCapability}from"@/lib/social-providers/types";

type Props={role:"official"|"backup";accounts:CreatorProviderAccount[];capabilities:ProviderConnectionCapability[];entitlements:CreatorEntitlements;oauthMessage?:string|null};

export function OnboardingAccounts({role,accounts,capabilities,entitlements,oauthMessage}:Props){
  const connected=accounts.filter(account=>account.role===role&&account.connected&&!account.archived&&!account.revoked);
  const connectedSuccess=connected.length>0;
  const officialConnected=role==="official"&&connectedSuccess;
  const backupConnected=role==="backup"&&connectedSuccess;
  const capabilityMap=new Map(capabilities.map(item=>[item.provider,item]));
  const slot=entitlements.providerConnections[role],locked=slot.limit!==null&&!slot.allowed;
  const picker=<div className="onboarding-provider-grid">{PLATFORMS.filter(platform=>platform.id!=="more").map(platform=>{
    const capability=capabilityMap.get(platform.id as never),isConnected=connected.some(account=>account.provider===platform.id),state=providerPickerState(capability,isConnected,role,locked);
    const href=state.href?`${state.href}&returnTo=onboarding`:undefined;
    return <a key={platform.id} href={href} aria-disabled={state.disabled} onClick={event=>state.disabled&&event.preventDefault()} className={`onboarding-provider-card is-${state.tone}`}><span className="platform-brand-icon" style={{color:platform.brandColor,background:platform.brandBackground}}><platform.icon size={22}/></span><span><strong>{capability?.displayName??platform.name}</strong><small>{capability?.description??platform.description}</small></span><i>{state.label==="Connected"&&<Check size={13}/>} {state.label}{!state.disabled&&<ChevronRight size={13}/>}</i></a>})}</div>;
  return <section className={`onboarding-accounts${connectedSuccess?" is-success":""}`}><header>{connectedSuccess&&<span className="onboarding-success-icon"><ShieldCheck aria-hidden size={26}/><span className="sr-only">Success</span></span>}<p className={`eyebrow${connectedSuccess?" onboarding-success-eyebrow":""}`}>{officialConnected?"Main account connected":backupConnected?"Recovery destination connected":role==="official"?"Where followers know you":"Where followers can find you next"}</p><h1>{officialConnected?"Your main account is connected":backupConnected?"Your Recovery destination is connected":role==="official"?"Connect your Main account":"Add a Recovery destination"}</h1><p>{officialConnected?"Your audience now has a trusted account to recognize you from.":backupConnected?"Your audience now has another trusted place to find you if your main account becomes unavailable.":role==="official"?"This is the account your followers already know and trust.":"Add another place followers can find you if your Main account becomes unavailable."}</p></header>
    {oauthMessage&&<p className="onboarding-oauth-message" role="alert">{oauthMessage}</p>}
    {connected.length>0?<><div className="onboarding-connected-grid">{connected.map(account=><article key={account.accountKey} className="onboarding-connected-card"><PlatformBrandIcon provider={account.provider} label={account.provider}/><div><span>{capabilityMap.get(account.provider)?.displayName??account.provider}</span><h2>{account.displayName}</h2>{account.handle&&account.handle!==account.displayName&&<p>{account.handle}</p>}<small>{role==="official"?"Main account":"Recovery destination"}</small></div><strong><Check aria-hidden size={14}/> Connected</strong></article>)}</div><details className="onboarding-change-account"><summary>Change account</summary>{picker}</details></>:picker}
    <form action={completeAccountStep} className="onboarding-step-actions">{officialConnected&&<p className="onboarding-next-step">Next, add a Recovery destination so your followers have another trusted place to find you.</p>}<input type="hidden" name="step" value={role}/><button className="button button-primary" type="submit">{officialConnected?"Continue to Recovery destination":backupConnected?"Continue to finish":"Skip for now"}</button>{!connectedSuccess&&<p>You can connect this account later from Platforms.</p>}</form>
  </section>
}
