"use client";

import type {KeyboardEvent} from "react";
import {Check,Circle,Link2,LockKeyhole,ShieldCheck,Sparkles} from "lucide-react";
import {PlatformBrandIcon} from "@/components/dashboard/platform-brand-icon";
import type {ProviderConnectionCapability} from "@/lib/social-providers/types";
import type {PlatformDefinition} from "@/lib/platforms";

export type ConnectionMethod="automatic"|"manual"|null;
type AccountRole="official"|"backup";

export function providerConnectionBenefits(capability:ProviderConnectionCapability){
  const benefits:string[]=[];
  if(capability.supportsAutomaticVerification)benefits.push("Verified connection");
  if(capability.supportsAudienceMetrics)benefits.push("Automatic audience sync");
  if(capability.supportsPolling||capability.supportsWebhooks)benefits.push("Connection health monitoring");
  benefits.push(capability.provider==="youtube"?"Read-only access":"Secure provider authorization");
  return benefits.slice(0,4);
}

export function ProviderConnectionMethodSelector({platform,capability,value,onChange,role}:{
  platform:PlatformDefinition;capability?:ProviderConnectionCapability;value:ConnectionMethod;
  onChange:(method:Exclude<ConnectionMethod,null>)=>void;role:AccountRole;
}){
  const automaticSupported=capability?.oauthSupported===true,automaticAvailable=capability?.connectable===true,manualAvailable=true;
  const methods:(["automatic"|"manual",boolean])[]=([["automatic",automaticSupported],["manual",manualAvailable]] as (["automatic"|"manual",boolean])[]).filter((entry)=>entry[1]);
  const unavailable=capability?.configurationStatus==="invalid"?"Provider connection has a configuration error.":capability?.oauthStatus==="review_required"?"Provider approval is required before this connection is available.":"Provider connection is not configured in this environment.";
  const roleName=role==="official"?"Main":"Recovery",automaticDescription=role==="official"?"Verify your account and keep AudienceOwn synchronized automatically.":"Verify the Recovery account and keep its connection health synchronized.";
  const manualDescription=role==="official"?`Add the public ${platform.name} profile manually without provider authorization.`:`Add the public ${platform.name} profile as a Recovery destination without provider authorization.`;
  function chooseWithKeyboard(event:KeyboardEvent<HTMLButtonElement>,current:"automatic"|"manual"){
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)||methods.length<2)return;
    event.preventDefault();const index=methods.findIndex(([method])=>method===current),offset=event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:1,next=methods[(index+offset+methods.length)%methods.length][0];onChange(next);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-method="${next}"]`)?.focus();
  }
  return <div className="provider-connection-experience" style={{"--provider-color":platform.brandColor,"--provider-background":platform.brandBackground} as React.CSSProperties}>
    <section className={`provider-identity ${role==="official"?"is-main":"is-recovery"}`} aria-label={`${platform.name} ${roleName} account`}><PlatformBrandIcon provider={platform.id} label={platform.name}/><span><strong>{platform.name}</strong><small>{roleName} account</small><p>{role==="official"?`This will be your primary ${platform.name} account in this Recovery Network.`:`This will be a trusted ${platform.name} Recovery account in this Recovery Network.`}</p></span><span className="provider-watermark" aria-hidden><PlatformBrandIcon provider={platform.id} label={platform.name}/></span></section>
    <fieldset className="connection-method-fieldset"><legend><span className="method-heading-icon"><Link2/></span><span>Choose how to connect<small>Select the connection that works best for this account.</small></span></legend>
      {!methods.length?<aside className="connection-method-empty" role="status"><LockKeyhole/><span><strong>Connection unavailable</strong><small>This provider does not currently offer an available connection method.</small></span></aside>:<div className={`connection-method-grid ${methods.length===1?"is-single":""}`} role="radiogroup" aria-label={`Connection method for ${platform.name}`}>
        {automaticSupported&&<button type="button" role="radio" aria-checked={value==="automatic"} data-method="automatic" tabIndex={value===null||value==="automatic"?0:-1} className={`connection-method-card automatic ${value==="automatic"?"is-selected":""}`} disabled={!automaticAvailable} onClick={()=>onChange("automatic")} onKeyDown={event=>chooseWithKeyboard(event,"automatic")}><span className="method-recommendation"><Sparkles/> Recommended</span><span className="method-selection" aria-hidden>{value==="automatic"?<Check/>:<Circle/>}</span><span className="method-icon"><PlatformBrandIcon provider={platform.id} label={platform.name}/></span><span className="method-copy"><strong>Connect with {platform.name}</strong><small>{automaticAvailable?automaticDescription:unavailable}</small></span>{automaticAvailable?<span className="method-points">{providerConnectionBenefits(capability!).map(point=><i key={point}><Check/>{point}</i>)}</span>:<span className="method-unavailable">Currently unavailable</span>}</button>}
        {manualAvailable&&<button type="button" role="radio" aria-checked={value==="manual"} data-method="manual" tabIndex={value==="manual"||(!automaticSupported&&value===null)?0:-1} className={`connection-method-card manual ${value==="manual"?"is-selected":""}`} onClick={()=>onChange("manual")} onKeyDown={event=>chooseWithKeyboard(event,"manual")}><span className="method-fallback">Manual</span><span className="method-selection" aria-hidden>{value==="manual"?<Check/>:<Circle/>}</span><span className="method-icon"><Link2/></span><span className="method-copy"><strong>Add URL or handle</strong><small>{manualDescription}</small></span><span className="method-points"><i><Check/>Quick setup</i><i><Check/>Public profile link</i><i className="is-limited"><Circle/>No automatic synchronization</i></span></button>}
      </div>}
    </fieldset>
    {automaticAvailable&&<aside className="provider-trust-strip"><div><span className="trust-icon"><ShieldCheck/></span><span><strong>Secure connection</strong><small>AudienceOwn only requests the access required for this connection.</small></span></div><div><span className="trust-icon"><LockKeyhole/></span><span><strong>{platform.id==="youtube"?"Read-only YouTube access":`${platform.name} authorization`}</strong><small>{platform.id==="youtube"?"We never post, update, or delete content.":`Authorization follows ${platform.name}’s configured provider capabilities.`}</small></span></div></aside>}
  </div>;
}
