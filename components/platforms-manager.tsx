"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- pricing is the current non-checkout upgrade destination */

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Link2, LockKeyhole, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { ProviderConnectionMethodSelector, type ConnectionMethod } from "@/components/providers/provider-connection-method-selector";
import type { ProviderConnectionCapability } from "@/lib/social-providers/types";
import { removeMainAccount, savePlatformGroup, type PlatformSaveState } from "@/app/actions/creator";
import { PLATFORMS, getPlatform, normalizePlatformAccount, platformFromAccount, searchPlatforms, type PlatformId } from "@/lib/platforms";
import type {CreatorEntitlements} from "@/lib/provider-entitlements";
import {canonicalAccountConnected,resolveConnectionStatus} from "@/lib/social-providers/connection-health";

export type PlatformAccount = {
  id:string; platform:string; account_type:string; label:string; url:string; is_primary:boolean;
  is_public:boolean; position:number; connection_health?:string | null; provider_status?:string | null;
  audience_count?:number | null; audience_unit?:string | null;
  audience_unavailable?:boolean;
  protected_official_account_id?:string|null;
  external_account_id?:string|null;
};
type DraftAccount = { id?:string; platformId:PlatformId; value:string; label?:string; isPublic:boolean; audienceCount?:number|null; audienceUnit?:string|null; audienceUnavailable?:boolean; health?:string|null; providerStatus?:string|null; externalAccountId?:string|null; protectedOfficialAccountId?:string|null };
type Draft = { officials:DraftAccount[]; backups:DraftAccount[] };
type AccountFlow = { role:"official"|"backup"; index:number|null; platformId:PlatformId|null; method:ConnectionMethod; step:"picker"|"method"|"details" };

export function providerPickerState(capability:ProviderConnectionCapability|undefined,connected:boolean,role:"official"|"backup",planLocked=false){
  const implemented=capability?.implementationStatus==="implemented",connectable=Boolean(capability?.connectable),review=connectable&&(capability?.reviewStatus==="required"||capability?.reviewStatus==="unknown"),invalid=implemented&&capability?.configurationStatus==="invalid",setup=implemented&&capability?.configurationStatus==="missing";
  return{disabled:connected||planLocked||!connectable,label:connected?"Connected":invalid?"Configuration error":setup?"Setup required":planLocked?"Upgrade to Pro":review?"App review required · Connect":connectable?"Connect":"Coming soon",tone:connected?"connected":invalid||setup?"setup":planLocked?"locked":review?"review":connectable?"available":"soon",href:!planLocked&&connectable&&capability?.connectPath?`${capability.connectPath}?role=${role}`:null};
}

function accountDraft(account:PlatformAccount):DraftAccount {
  return { id:account.id, platformId:platformFromAccount(account.platform,account.url).id, value:account.url,
    label:account.label, isPublic:account.is_public, audienceCount:account.audience_count, audienceUnit:account.audience_unit, audienceUnavailable:account.audience_unavailable,
    health:account.connection_health, providerStatus:account.provider_status, externalAccountId:account.external_account_id, protectedOfficialAccountId:account.protected_official_account_id };
}
function metric(account:DraftAccount) {
  if (account.audienceCount === null || account.audienceCount === undefined || !account.audienceUnit) return null;
  return `${new Intl.NumberFormat("en",{notation:account.audienceCount>=10_000?"compact":"standard",maximumFractionDigits:1}).format(account.audienceCount)} ${account.audienceUnit}`;
}
function AccountCard({account,onManage,onRemove,backupFor}:{account:DraftAccount;onManage:()=>void;onRemove:()=>void;backupFor?:string}) {
  const platform=getPlatform(account.platformId)!; const Icon=platform.icon; const canonicalConnected=canonicalAccountConnected({health:account.health,providerStatus:account.providerStatus,hasPublicUrl:Boolean(account.value),hasExternalAccountId:Boolean(account.externalAccountId)}); const state=resolveConnectionStatus({health:account.health,providerStatus:account.providerStatus,canonicalConnected}); const tone=state.connectionTone==="success"?"good":"warning";
  return <article className="official-account-card" style={{"--account-color":platform.brandColor} as React.CSSProperties}>
    <div className="official-account-main"><span className="platform-brand-icon" style={{color:platform.brandColor,background:platform.brandBackground}}><Icon size={20}/></span>
      <div><small>{platform.name}</small><strong>{account.label||account.value}</strong>{backupFor&&<p>Backup for: {backupFor}</p>}{account.platformId==="spotify"&&<p>Spotify profile</p>}{account.platformId==="linkedin"&&<p>{account.value.includes("/company/")?"Organization":"Professional profile"}</p>}{account.audienceUnavailable?<p>Native audience unavailable</p>:metric(account)?<p>{metric(account)}</p>:["spotify","linkedin","pinterest"].includes(account.platformId)&&<p>Audience metric unavailable</p>}</div></div>
    <div className="official-account-foot"><span className={`plain-account-status is-${tone}`}><i/>{state.connectionLabel}</span>
      <div><button type="button" onClick={onManage}>Manage <ChevronRight size={14}/></button><button type="button" className="quiet-remove" aria-label={`Remove ${account.label||platform.name}`} onClick={onRemove}><Trash2 size={14}/></button></div></div>
  </article>;
}

export function PlatformsManager({accounts,connectionCapabilities,entitlements}:{accounts:PlatformAccount[];connectionCapabilities:ProviderConnectionCapability[];entitlements:CreatorEntitlements}) {
  const router=useRouter();
  const savedOfficials=useMemo(()=>accounts.filter(a=>a.account_type==="official").sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||a.position-b.position),[accounts]);
  const savedBackups=useMemo(()=>accounts.filter(a=>a.account_type==="backup").sort((a,b)=>a.position-b.position),[accounts]);
  const [query,setQuery]=useState(""); const [open,setOpen]=useState(false); const [dirty,setDirty]=useState(false);
  const [draft,setDraft]=useState<Draft>({officials:savedOfficials.map(accountDraft),backups:savedBackups.map(accountDraft)});
  const [flow,setFlow]=useState<AccountFlow|null>(null); const [flowAccount,setFlowAccount]=useState<DraftAccount|null>(null);
  const [removing,setRemoving]=useState<string|null>(null); const [state,action,pending]=useActionState<PlatformSaveState,FormData>(savePlatformGroup,{});
  const dialogRef=useRef<HTMLDivElement>(null); const flowDialogRef=useRef<HTMLElement>(null); const returnFocus=useRef<HTMLElement|null>(null);
  const handledSuccessfulSave=useRef(false);
  const capabilities=useMemo(()=>new Map(connectionCapabilities.map(item=>[item.provider,item])),[connectionCapabilities]);
  const connectedOfficial=new Set(draft.officials.map(a=>a.platformId));
  const connectedBackup=new Set(draft.backups.map(a=>a.platformId));
  const officialLocked=entitlements.providerConnections.official.limit!==null&&!entitlements.providerConnections.official.allowed;
  const backupLocked=entitlements.providerConnections.backup.limit!==null&&!entitlements.providerConnections.backup.allowed;
  useEffect(()=>{if(!state.savedAccounts||handledSuccessfulSave.current)return;handledSuccessfulSave.current=true;router.push("/dashboard");},[state.savedAccounts,router]);
  useEffect(()=>{if(!open)return;const node=flowDialogRef.current??dialogRef.current;node?.querySelector<HTMLElement>('button:not([disabled]),a[href],input:not([disabled])')?.focus();const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();if(flow){setFlow(null);setFlowAccount(null);}else closeModal();return;}if(event.key!=="Tab"||!node)return;const focusable=[...node.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(item=>item.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1)!;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key);});
  function openModal(trigger:HTMLElement){returnFocus.current=trigger;setDraft({officials:savedOfficials.map(accountDraft),backups:savedBackups.map(accountDraft)});setDirty(false);setOpen(true);}
  function closeModal(){if(dirty&&!window.confirm("Discard your unsaved changes?"))return;setOpen(false);setFlow(null);setFlowAccount(null);requestAnimationFrame(()=>returnFocus.current?.focus());}
  function change(recipe:(value:Draft)=>Draft){setDraft(recipe);setDirty(true);}
  function startFlow(role:"official"|"backup",index:number|null=null){
    if(index!==null){const item=role==="official"?draft.officials[index]:draft.backups[index];setFlowAccount({...item});setFlow({role,index,platformId:item.platformId,method:null,step:"method"});}
    else {setFlowAccount(null);setFlow({role,index:null,platformId:null,method:null,step:"picker"});}
  }
  function choosePlatform(platformId:PlatformId){const capability=capabilities.get(platformId as never);if(!capability?.connectable)return;const eligible=draft.officials.filter(item=>item.platformId===platformId&&item.id);setFlowAccount({platformId,value:"",label:"",isPublic:true,protectedOfficialAccountId:eligible.length===1?eligible[0].id:null});setFlow(current=>current?{...current,platformId,method:null,step:"method"}:current);}
  function saveFlow(){if(!flow||!flowAccount)return;const list=flow.role==="official"?"officials":"backups";change(value=>({...value,[list]:flow.index===null?[...value[list],flowAccount]:value[list].map((item,index)=>index===flow.index?flowAccount:item)}));setFlow(null);setFlowAccount(null);}
  async function removeOfficial(index:number){const item=draft.officials[index];if(item.id){setRemoving(item.id);const result=await removeMainAccount(item.id);setRemoving(null);if(result.error){window.alert(result.error);return;}}
    change(value=>({...value,officials:value.officials.filter((_,i)=>i!==index)}));router.refresh();}
  const filtered=searchPlatforms(query).filter(item=>item.id!=="more");
  const payload=JSON.stringify(draft);

  return <div className="platforms-workspace">
    <section className="platform-library" aria-labelledby="platform-library-title"><div className="platform-library-heading"><div><p className="eyebrow">Platform library</p><h2 id="platform-library-title">Choose where you show up</h2></div><p>{PLATFORMS.length-1} supported destinations</p></div>
      <label className="platform-search"><Search size={20}/><span className="sr-only">Search platforms</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search platforms"/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery("")}><X size={16}/></button>}</label>
      <div className="platform-selector-grid">{filtered.map(platform=>{const Icon=platform.icon;const connected=accounts.some(a=>platformFromAccount(a.platform,a.url).id===platform.id);return <button key={platform.id} type="button" className="platform-option" onClick={e=>openModal(e.currentTarget)}><span className="platform-brand-icon" style={{color:platform.brandColor,background:platform.brandBackground}}><Icon size={28}/></span><span className="platform-card-copy"><strong>{platform.name}</strong><small>{platform.description}</small></span>{connected&&<span className="platform-connected-badge"><Check size={12}/> Connected</span>}</button>;})}</div>
    </section>
    <section className="connected-platforms"><div className="connected-platforms-heading"><div><p className="eyebrow">Connected</p><h2>Your platforms</h2></div><button type="button" className="button button-secondary" onClick={e=>openModal(e.currentTarget)}><Plus size={16}/> Configure accounts</button></div>
      {accounts.length?<p className="connected-platform-count"><span/><strong>{savedOfficials.length}</strong> official · <strong>{savedBackups.length}</strong> backup</p>:<div className="connected-empty"><span><Link2 size={20}/></span><div><strong>No platforms connected yet</strong><p>Configure your official presence and recovery destinations.</p></div></div>}
    </section>

    {open&&<div className="platform-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&closeModal()}><div ref={dialogRef} className="platform-modal accounts-config-modal" role="dialog" aria-modal="true" aria-labelledby="platform-editor-title"><form action={action}><input type="hidden" name="payload" value={payload}/>
      <header className="platform-editor-header"><div><div><h2 id="platform-editor-title">Configure accounts</h2><p>Manage your official and backup destinations.</p></div></div><button type="button" aria-label="Close account editor" onClick={closeModal}><X size={20}/></button></header>
      <div className="platform-modal-body">
        <section className="setup-progress compact-progress" aria-label="Setup progress"><p className="account-step">Setup progress</p><div><span><small>Official accounts</small><strong>{entitlements.providerConnections.official.limit===null?"Unlimited":`${draft.officials.length} of 1 used`}</strong></span><span><small>Backup accounts</small><strong>{entitlements.providerConnections.backup.limit===null?"Unlimited":`${draft.backups.length} of 1 used`}</strong></span><span><small>Recovery readiness</small><strong>{draft.officials.length&&draft.backups.length?"Ready":"Needs attention"}</strong></span></div></section>
        <section className="accounts-overview-section"><div className="accounts-section-copy"><p className="account-step">Official accounts</p><h3>Your official accounts</h3><p>Connect the platforms your audience knows you from.</p></div>
          {draft.officials.length?<div className="official-accounts-grid">{draft.officials.map((item,index)=><AccountCard key={item.id??`${item.platformId}-${index}`} account={item} onManage={()=>startFlow("official",index)} onRemove={()=>removeOfficial(index)}/>)}</div>:<div className="clean-empty"><strong>No official accounts connected</strong><p>Add the first platform your audience knows you from.</p></div>}
          <button type="button" className="add-account-row" onClick={()=>startFlow("official")}><Plus size={17}/> Add official account</button>
        </section>
        <section className="accounts-overview-section backup-section"><div className="accounts-section-copy"><p className="account-step">Backup accounts</p><h3>Protected ways to find you</h3><p>Give your audience another trusted place to find you if an official account becomes unavailable.</p></div>
          {draft.backups.length?<div className="official-accounts-grid">{draft.backups.map((item,index)=><AccountCard key={item.id??`${item.platformId}-${index}`} account={item} backupFor={draft.officials.find(official=>official.id===item.protectedOfficialAccountId)?.label} onManage={()=>startFlow("backup",index)} onRemove={()=>change(value=>({...value,backups:value.backups.filter((_,i)=>i!==index)}))}/>)}</div>:<div className="clean-empty"><ShieldCheck size={19}/><div><strong>No backup accounts protected yet</strong><p>Add a separate recovery destination for your audience.</p></div></div>}
          <button type="button" className="add-account-row" onClick={()=>startFlow("backup")}><Plus size={17}/> Add backup account</button>
        </section>
        {state.error&&<p className="platform-form-message error" role="alert">{state.error}</p>}{state.success&&<p className="platform-form-message success"><Check size={15}/>{state.success}</p>}
      </div>
      <footer className="platform-editor-actions"><span>{dirty?"Unsaved account changes":"Your accounts are up to date"}</span><div><button type="button" className="button button-secondary" onClick={closeModal}>Cancel</button><button className="button button-primary" disabled={pending||!dirty}>{pending?"Saving…":"Save changes"}</button></div></footer>
    </form>
    {flow&&<div className="backup-flow-backdrop"><section ref={flowDialogRef} className="backup-flow-modal account-picker-modal" role="dialog" aria-modal="true" aria-labelledby="account-flow-title"><header><div><h3 id="account-flow-title">{flow.index===null?`Add ${flow.role === "official" ? "an official" : "a backup"} account`:`Manage ${flow.role} account`}</h3><p>{flow.step==="picker"?"Choose the platform you want to connect.":flow.platformId?getPlatform(flow.platformId)?.name:""}</p></div><button type="button" aria-label="Close" onClick={()=>{setFlow(null);setFlowAccount(null);}}><X size={18}/></button></header>
      {flow.step!=="picker"&&flowAccount&&(()=>{const canonicalConnected=canonicalAccountConnected({health:flowAccount.health,providerStatus:flowAccount.providerStatus,hasPublicUrl:Boolean(flowAccount.value),hasExternalAccountId:Boolean(flowAccount.externalAccountId)}),state=resolveConnectionStatus({health:flowAccount.health,providerStatus:flowAccount.providerStatus,canonicalConnected});return state.capabilityNotice?<aside className="platform-form-message" aria-label="Connection capability"><strong>Connection: {state.connectionLabel}</strong><p>{state.capabilityNotice}</p>{!state.actionRequired&&<p>No action is required from you.</p>}</aside>:null;})()}
      <div className="backup-flow-body">{flow.step==="picker"&&<>{(flow.role==="official"?officialLocked:backupLocked)&&<aside className="provider-upgrade-banner" aria-label="Free plan limit reached"><div className="provider-upgrade-status"><span className="provider-upgrade-lock" aria-hidden><LockKeyhole size={21}/></span><div><strong>You&apos;ve reached your Free plan limit.</strong><p>Free includes 1 {flow.role} account.</p></div></div><p className="provider-upgrade-explanation">Upgrade to Pro to add more platforms and unlock unlimited official and backup accounts.</p><a className="button button-primary provider-upgrade-cta" href="/#pricing">Upgrade to Pro</a></aside>}<div className="official-platform-picker">{PLATFORMS.filter(p=>p.id!=="more").map(platform=>{const Icon=platform.icon,capability=capabilities.get(platform.id as never),connected=flow.role==="official"?connectedOfficial.has(platform.id):connectedBackup.has(platform.id),card=providerPickerState(capability,connected,flow.role,flow.role==="official"?officialLocked:backupLocked);return <button key={platform.id} type="button" disabled={card.disabled} data-connect-href={card.href??undefined} onClick={()=>choosePlatform(platform.id)}><span className="platform-brand-icon" style={{color:platform.brandColor,background:platform.brandBackground}}><Icon size={19}/></span><span><strong>{capability?.displayName??platform.name}</strong><small>{capability?.description??platform.description}</small></span><i className={card.tone}>{card.label==="Connected"?<><Check size={12}/> Connected</>:card.label.includes("Connect")?<>{card.label} <ChevronRight size={12}/></>:card.label}</i></button>;})}</div></>}
      {flow.step==="method"&&flow.platformId&&<ProviderConnectionMethodSelector platform={getPlatform(flow.platformId)!} capability={capabilities.get(flow.platformId as never)} value={flow.method} roleLabel={`${flow.role} account`} onChange={method=>setFlow(current=>current?{...current,method}:current)}/>}
      {flow.step==="details"&&flow.platformId&&flowAccount&&<div className="manual-connection-fields"><label className="label" htmlFor="account-flow-value">{getPlatform(flow.platformId)!.fieldLabel}</label><div className="platform-url-input"><Link2 size={16}/><input id="account-flow-value" value={flowAccount.value} onChange={e=>setFlowAccount({...flowAccount,value:e.target.value})} placeholder={getPlatform(flow.platformId)!.placeholder}/></div>{flowAccount.value&&(()=>{const normalized=normalizePlatformAccount(flowAccount.platformId,flowAccount.value);return "error" in normalized?<p className="field-error">{normalized.error}</p>:null;})()}<label className="flow-label">Label <small>(optional)</small><input value={flowAccount.label??""} onChange={e=>setFlowAccount({...flowAccount,label:e.target.value})} placeholder={`e.g. ${getPlatform(flow.platformId)!.name} account`}/></label></div>}</div>
      <footer><button type="button" className="button button-secondary" onClick={()=>flow.step==="picker"?(setFlow(null),setFlowAccount(null)):setFlow(current=>current?{...current,step:current.step==="details"?"method":"picker",method:current.step==="details"?current.method:null}:current)}>{flow.step==="picker"?"Cancel":"Back"}</button>
        {flow.step==="method"&&flow.platformId&&flow.method==="automatic"?<a className="button button-primary" href={`${capabilities.get(flow.platformId as never)?.connectPath}?role=${flow.role}${flowAccount?.id?`&connectionId=${encodeURIComponent(flowAccount.id)}`:""}${flowAccount?.protectedOfficialAccountId?`&protectedOfficialAccountId=${encodeURIComponent(flowAccount.protectedOfficialAccountId)}`:""}`}>Connect with {getPlatform(flow.platformId)!.name}</a>:flow.step==="method"?<button type="button" className="button button-primary" disabled={!flow.method} onClick={()=>setFlow(current=>current?{...current,step:"details"}:current)}>Continue</button>:flow.step==="details"?<button type="button" className="button button-primary" disabled={!flowAccount?.value.trim()} onClick={saveFlow}>Save account</button>:null}</footer>
    </section></div>}
    {removing&&<span className="sr-only" role="status">Removing account</span>}</div></div>}
  </div>;
}
