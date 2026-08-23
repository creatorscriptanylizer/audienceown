"use client";
/* eslint-disable @typescript-eslint/no-unused-expressions -- compact JSX callback retains the established configure branch */

import {useActionState,useEffect,useRef,useState} from "react";
import type React from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowDown,ArrowRight,Check,Ellipsis,Plus,ShieldCheck,Trash2,TriangleAlert,X} from "lucide-react";
import {removeMainAccount} from "@/app/actions/creator";
import {savePersistentRecoveryNetwork,type PersistentRecoveryNetworkState} from "@/app/actions/persistent-recovery-network";
import {removeRecoveryAccount} from "@/app/actions/recovery-account";
import {PlatformBrandIcon} from "@/components/dashboard/platform-brand-icon";
import type {PlatformAccount} from "@/components/platforms-manager";
import {canonicalAccountConnected,resolveConnectionStatus} from "@/lib/social-providers/connection-health";
import type {PersistentRecoveryNetwork} from "./recovery-network-manager";
import styles from "./recovery-network-manager.module.css";

type MenuState={kind:"network"|"assign"|"recovery"|"unassigned";id:string}|null;
type DeleteState={account:PlatformAccount;network?:PersistentRecoveryNetwork}|null;

export function eligibleRecoveryNetworkOptions(networks:PersistentRecoveryNetwork[]){
  const seenNetworks=new Set<string>(),seenMains=new Set<string>();
  return networks.filter(network=>{
    const mainId=network.main_connected_account_id;
    if(!mainId||seenNetworks.has(network.id)||seenMains.has(mainId))return false;
    seenNetworks.add(network.id);seenMains.add(mainId);return true;
  });
}

export function RecoveryNetworksPage({accounts,networks,onConfigure,canCreateNetwork=true}:{accounts:PlatformAccount[];networks:PersistentRecoveryNetwork[];canCreateNetwork?:boolean;onConfigure:(role:"official"|"backup",mainAccountId?:string,recoveryNetworkId?:string)=>void}){
  const router=useRouter();
  const mains=accounts.filter(account=>account.account_type==="official");
  const recoveries=accounts.filter(account=>account.account_type==="backup");
  const assignedIds=new Set(networks.flatMap(network=>network.recovery_account_ids));
  const unassigned=recoveries.filter(account=>!assignedIds.has(account.id));
  const visibleNetworks=networks.filter(network=>network.main_connected_account_id||network.recovery_account_ids.length);
  const assignmentTargets=eligibleRecoveryNetworkOptions(networks);
  const [menu,setMenu]=useState<MenuState>(null);
  const [deleting,setDeleting]=useState<DeleteState>(null);
  const [deletePending,setDeletePending]=useState(false);
  const [deleteError,setDeleteError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const returnFocus=useRef<HTMLElement|null>(null);
  const dialogRef=useRef<HTMLElement|null>(null);
  const [state,saveAction,savePending]=useActionState<PersistentRecoveryNetworkState,FormData>(async(previous,formData)=>{
    const result=await savePersistentRecoveryNetwork(previous,formData);
    if(result.success){
      const recoveryLabel=String(formData.get("recovery_account_label")??"Recovery account");
      const mainLabel=String(formData.get("main_account_label")??"selected Main account");
      setMenu(null);setNotice(`${recoveryLabel} Added to ${mainLabel}’s Recovery Network`);router.refresh();
    }
    return result;
  },{});

  function health(account:PlatformAccount){
    const connected=canonicalAccountConnected({health:account.connection_health,providerStatus:account.provider_status,hasPublicUrl:Boolean(account.url),hasExternalAccountId:Boolean(account.external_account_id)});
    return resolveConnectionStatus({health:account.connection_health,providerStatus:account.provider_status,canonicalConnected:connected});
  }
  function audience(account:PlatformAccount){
    if(account.audience_count!=null&&account.audience_unit)return `${new Intl.NumberFormat("en").format(account.audience_count)} native ${account.audience_unit}`;
    if(account.platform==="spotify")return "Spotify profile · Audience metric unavailable";
    return "Audience metric unavailable";
  }
  function toggleMenu(next:Exclude<MenuState,null>,trigger:HTMLElement){
    returnFocus.current=trigger;
    setMenu(current=>current?.kind===next.kind&&current.id===next.id?null:next);
  }
  function navigateMenu(event:React.KeyboardEvent<HTMLElement>){
    if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
    const items=[...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
    if(!items.length)return;event.preventDefault();
    const current=items.indexOf(document.activeElement as HTMLElement);
    const next=event.key==="Home"?0:event.key==="End"?items.length-1:event.key==="ArrowDown"?(current+1+items.length)%items.length:(current-1+items.length)%items.length;
    items[next]?.focus();
  }
  function requestDelete(account:PlatformAccount,network?:PersistentRecoveryNetwork){
    returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    setMenu(null);setDeleteError(null);setDeleting({account,network});
  }
  async function confirmDelete(){
    if(!deleting||deletePending)return;
    setDeletePending(true);
    const result=deleting.account.account_type==="official"?await removeMainAccount(deleting.account.id):await removeRecoveryAccount(deleting.account.id);
    setDeletePending(false);
    if(result.error){setDeleteError(result.error);return;}
    setNotice(deleting.account.account_type==="official"?"Main account deleted":"Recovery account deleted");
    setDeleting(null);router.refresh();
  }
  function closeDelete(){if(deletePending)return;setDeleting(null);requestAnimationFrame(()=>returnFocus.current?.focus());}

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"&&menu){event.preventDefault();setMenu(null);requestAnimationFrame(()=>returnFocus.current?.focus());}
      if(event.key!=="Tab"||!deleting||!dialogRef.current)return;
      const items=[...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')];
      if(!items.length)return;const first=items[0],last=items.at(-1)!;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey);
  },[menu,deleting]);
  useEffect(()=>{if(deleting)dialogRef.current?.querySelector<HTMLElement>("button")?.focus();},[deleting]);

  return <section className={styles.workspace} aria-labelledby="recovery-networks-title">
    <header className={styles.pageHeading}><div><p className="eyebrow">Your Resilience</p><h2 id="recovery-networks-title">Your Recovery Networks</h2><p>Organize and protect your presence across platforms.</p></div><button ref={node=>{if(node&&!returnFocus.current)returnFocus.current=node;}} type="button" className={styles.setupNetworkAction} disabled={!canCreateNetwork} onClick={()=>onConfigure("official")}><Plus/> Set Up a Recovery Network <ArrowRight/></button></header>

    {!visibleNetworks.length?<section className={styles.simpleEmpty}><ShieldCheck/><h3>No Recovery Networks Yet</h3><p>Pair a Main Account with another trusted destination to start protecting your audience.</p><button type="button" disabled={!canCreateNetwork} onClick={()=>onConfigure("official")}><Plus/> Set Up a Recovery Network <ArrowRight/></button></section>:<div className={styles.grid}>{visibleNetworks.map((network,index)=>{
      const main=mains.find(account=>account.id===network.main_connected_account_id)??null;
      const linked=network.recovery_account_ids.map(id=>recoveries.find(account=>account.id===id)).filter((account):account is PlatformAccount=>Boolean(account));
      if(!main)return <article className={`${styles.network} ${styles.emptyNetwork}`} key={network.id} style={{"--network-index":index} as React.CSSProperties}><span className={styles.incomplete}><TriangleAlert/> Needs Main Account</span><h3>No Main Account</h3><p>Connect the platform account this Recovery Network should protect.</p><button className={styles.addMain} onClick={()=>onConfigure("official",undefined,network.id)}><Plus/> Add Main Account <ArrowRight/></button></article>;
      const mainHealth=health(main);const needsAttention=mainHealth.actionRequired||linked.some(account=>health(account).actionRequired);
      return <article className={styles.network} key={network.id} style={{"--network-index":index} as React.CSSProperties}>
        <header><div className={styles.identity}><span><PlatformBrandIcon provider={main.platform} label={main.platform}/><ShieldCheck/></span><div><small><ShieldCheck/> Main Account</small><h3>{main.platform} · {main.label}</h3><p>{audience(main)}</p><p>{mainHealth.connectionLabel} ●</p></div></div><div className={styles.cardHeaderActions}><span className={needsAttention?styles.attention:linked.length?styles.protected:styles.incomplete}>{needsAttention?<><TriangleAlert/> Needs Attention</>:linked.length?<><Check/> Protected</>:<><TriangleAlert/> Needs Recovery Account</>}</span><button className={styles.menuTrigger} aria-label={`More actions for ${main.platform} · ${main.label}`} aria-haspopup="menu" aria-expanded={menu?.kind==="network"&&menu.id===network.id} onClick={event=>toggleMenu({kind:"network",id:network.id},event.currentTarget)}><Ellipsis/></button>{menu?.kind==="network"&&menu.id===network.id&&<div className={styles.actionMenu} role="menu"><button role="menuitem" onClick={()=>{setMenu(null);linked.length?onConfigure("backup",main.id,network.id):onConfigure("backup",main.id,network.id)}}><Plus/> Add Recovery Account</button><button role="menuitem" onClick={()=>{setMenu(null);onConfigure("official")}}><Plus/> Add Another Main Account</button><button role="menuitem" className={styles.destructiveMenuItem} onClick={()=>requestDelete(main,network)}><Trash2/> Delete Main Account</button></div>}</div></header>
        <div className={styles.relationship} aria-hidden><span/><ArrowDown/></div>
        <section className={styles.destinations} aria-label={`Recovery accounts for ${main.label}`}><h4>02 · Recovery Account</h4>{linked.length?<div>{linked.map(recovery=>{const recoveryHealth=health(recovery);return <article key={recovery.id} className={recoveryHealth.actionRequired?styles.needsAttention:""}><PlatformBrandIcon provider={recovery.platform} label={recovery.platform}/><span><small>Recovery Account</small><strong>{recovery.platform} · {recovery.label}</strong><em>{recoveryHealth.connectionLabel} ●</em></span><div className={styles.inlineMenu}><button className={styles.menuTrigger} aria-label={`More actions for ${recovery.platform} · ${recovery.label}`} aria-haspopup="menu" aria-expanded={menu?.kind==="recovery"&&menu.id===recovery.id} onClick={event=>toggleMenu({kind:"recovery",id:recovery.id},event.currentTarget)}><Ellipsis/></button>{menu?.kind==="recovery"&&menu.id===recovery.id&&<div className={styles.actionMenu} role="menu"><button role="menuitem" className={styles.destructiveMenuItem} onClick={()=>requestDelete(recovery)}><Trash2/> Delete Connection</button></div>}</div></article>})}</div>:<div className={styles.empty}><ShieldCheck/><span><strong>Protect {main.label}</strong><p>Add a trusted account where followers can find you when the Main account becomes unavailable.</p><button className={styles.addRecovery} onClick={()=>onConfigure("backup",main.id,network.id)}><Plus/> Add Recovery Account <ArrowRight/></button></span></div>}</section>
        <footer><button className={styles.addAnotherRecovery} onClick={()=>onConfigure("backup",main.id,network.id)}><Plus/> Add Another Recovery Account</button><button className={styles.addMain} onClick={()=>onConfigure("official")}><Plus/> Add Another Main Account</button></footer>
      </article>})}</div>}

    {unassigned.length>0&&<section className={styles.unassigned}><header><div><p className="eyebrow">Unassigned Recovery Accounts</p><h3>Finish Organizing Your Accounts</h3><p>These accounts are connected but are not assigned to a Recovery Network.</p></div></header><div>{unassigned.map(recovery=><article key={recovery.id}><PlatformBrandIcon provider={recovery.platform} label={recovery.platform}/><span><strong>{recovery.label}</strong><small>{recovery.platform} · Recovery Account</small><em><i/> {health(recovery).connectionLabel}</em></span><div className={styles.unassignedActions}>{assignmentTargets.length?<><button className={styles.assignTrigger} aria-haspopup="menu" aria-expanded={menu?.kind==="assign"&&menu.id===recovery.id} onClick={event=>toggleMenu({kind:"assign",id:recovery.id},event.currentTarget)}>Assign to Network <ArrowDown/></button>{menu?.kind==="assign"&&menu.id===recovery.id&&<div className={styles.assignmentMenu} role="menu" aria-label={`Assign ${recovery.label} to`} onKeyDown={navigateMenu}><p>Assign {recovery.label} to:</p>{assignmentTargets.map(network=>{const main=mains.find(account=>account.id===network.main_connected_account_id)!;return <form action={saveAction} key={network.id}><input type="hidden" name="recovery_network_id" value={network.id}/><input type="hidden" name="recovery_account_label" value={recovery.label}/><input type="hidden" name="main_account_label" value={main.label}/>{[...new Set([...network.recovery_account_ids,recovery.id])].map(id=><input key={id} type="hidden" name="recovery_account_ids" value={id}/>) }<button role="menuitem" disabled={savePending}><PlatformBrandIcon provider={main.platform} label={main.platform}/><span><strong>{main.label}</strong><small>{main.platform} · {network.recovery_account_ids.length} Recovery {network.recovery_account_ids.length===1?"Account":"Accounts"}</small></span></button></form>})}</div>}</>:<button className={styles.assignTrigger} onClick={()=>onConfigure("official")}><Plus/> Set Up a Recovery Network <ArrowRight/></button>}<button className={styles.menuTrigger} aria-label={`More actions for ${recovery.label}`} aria-haspopup="menu" aria-expanded={menu?.kind==="unassigned"&&menu.id===recovery.id} onClick={event=>toggleMenu({kind:"unassigned",id:recovery.id},event.currentTarget)}><Ellipsis/></button>{menu?.kind==="unassigned"&&menu.id===recovery.id&&<div className={styles.actionMenu} role="menu" onKeyDown={navigateMenu}><button role="menuitem" className={styles.destructiveMenuItem} onClick={()=>requestDelete(recovery)}><Trash2/> Delete Connection</button></div>}</div></article>)}</div>{state.error&&<p className={styles.error} role="alert">{state.error}</p>}</section>}

    <aside className={styles.education}><span><ShieldCheck/></span><div><h3>Why Use a Recovery Network?</h3><p>A Recovery Network gives your audience another trusted place to find you if a Main account becomes unavailable.</p></div><Link href="/dashboard/settings/recovery-pass">Learn More <ArrowRight/></Link></aside>
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
    {deleting&&<div className={styles.backdrop} onMouseDown={event=>event.target===event.currentTarget&&closeDelete()}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className={`${styles.dialog} ${styles.deleteDialog}`}><header><div><small>{deleting.account.account_type==="official"?"Delete Main Account":"Remove Connection"}</small><h3 id="delete-account-title">{deleting.account.account_type==="official"?`Delete ${deleting.account.platform} · ${deleting.account.label}?`:`Remove ${deleting.account.label}?`}</h3></div><button aria-label="Close confirmation" disabled={deletePending} onClick={closeDelete}><X/></button></header><div className={styles.deleteImpact}><p>This removes {deleting.account.label} from AudienceOwn. It does not delete your {deleting.account.platform} account.</p>{deleting.account.account_type==="official"&&<p>Your Recovery Network and its {deleting.network?.recovery_account_ids.length??0} Recovery accounts will remain in place.</p>}{deleting.account.account_type==="backup"&&<p>This Recovery account will be removed from every Recovery Network.</p>}{deleteError&&<p role="alert">{deleteError}</p>}<footer><button className="button button-secondary" disabled={deletePending} onClick={closeDelete}>Cancel</button><button className={`button ${styles.deleteConfirm}`} disabled={deletePending} onClick={confirmDelete}><Trash2/>{deletePending?"Removing…":deleting.account.account_type==="official"?"Delete Main Account":"Remove Connection"}</button></footer></div></section></div>}
  </section>;
}
