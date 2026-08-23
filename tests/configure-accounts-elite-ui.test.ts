import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {accountCapacityLabel,configureAccountGuidance,configureAccountStepStates} from "@/components/platforms-manager";
import {recoveryAccountsEligibleForNetwork,recoveryIdsAssignedToNetwork,recoveryNetworksForPresentation,type PersistentRecoveryNetwork} from "@/components/recovery-network-manager";

const manager=readFileSync("components/platforms-manager.tsx","utf8");
const networks=readFileSync("components/recovery-network-manager.tsx","utf8");
const css=readFileSync("components/recovery-network-manager.module.css","utf8");
const managerCss=readFileSync("components/platforms-manager.module.css","utf8");
const page=readFileSync("app/dashboard/platforms/page.tsx","utf8");

describe("Configure recovery networks control center",()=>{
  it("derives chooser assignments only from the current persistent Recovery Network",()=>{
    const networks:PersistentRecoveryNetwork[]=[
      {id:"kwamoon-network",main_connected_account_id:"kwamoon",position:0,recovery_account_ids:["lineconomy"]},
      {id:"watchboost-network",main_connected_account_id:"watchboost",position:1,recovery_account_ids:[]},
    ];
    expect(recoveryIdsAssignedToNetwork(networks,"kwamoon-network")).toEqual(["lineconomy"]);
    expect(recoveryIdsAssignedToNetwork(networks,"watchboost-network")).toEqual([]);
    expect(recoveryIdsAssignedToNetwork(networks,"missing-network")).toEqual([]);
    const watchboostSelection=recoveryIdsAssignedToNetwork(networks,"watchboost-network");
    watchboostSelection.push("lineconomy");
    expect(recoveryIdsAssignedToNetwork(networks,"kwamoon-network")).toEqual(["lineconomy"]);
    const accounts=[{id:"kwamoon",account_type:"official"},{id:"watchboost",account_type:"official"},{id:"lineconomy",account_type:"backup"},{id:"discord",account_type:"backup"}];
    expect(recoveryAccountsEligibleForNetwork(accounts,networks,"kwamoon-network").map(account=>account.id)).toEqual(["lineconomy","discord"]);
    expect(recoveryAccountsEligibleForNetwork(accounts,networks,"watchboost-network").map(account=>account.id)).toEqual(["discord"]);
    expect(recoveryIdsAssignedToNetwork([{id:"empty-main-network",main_connected_account_id:null,position:2,recovery_account_ids:["lineconomy"]}],"empty-main-network")).toEqual(["lineconomy"]);
  });

  it("presents at most one truly empty Recovery Network without hiding configured or partial networks",()=>{
    const fixture:PersistentRecoveryNetwork[]=[
      {id:"configured-a",main_connected_account_id:"main-a",position:0,recovery_account_ids:["recovery-a"]},
      {id:"empty-a",main_connected_account_id:null,position:1,recovery_account_ids:[]},
      {id:"empty-b",main_connected_account_id:null,position:2,recovery_account_ids:[]},
      {id:"partial",main_connected_account_id:null,position:3,recovery_account_ids:["recovery-b"]},
      {id:"configured-b",main_connected_account_id:"main-b",position:4,recovery_account_ids:[]},
    ];
    expect(recoveryNetworksForPresentation(fixture).map(network=>network.id)).toEqual(["configured-a","partial","configured-b"]);
    expect(recoveryNetworksForPresentation(fixture).filter(network=>network.main_connected_account_id===null&&network.recovery_account_ids.length===0)).toHaveLength(0);
    expect(recoveryNetworksForPresentation(fixture,true).map(network=>network.id)).toEqual(["configured-a","empty-a","partial","configured-b"]);
    expect(recoveryNetworksForPresentation(fixture,true).filter(network=>network.main_connected_account_id===null&&network.recovery_account_ids.length===0)).toHaveLength(1);
  });

  it("shows a passive first-run state with one explicit Recovery Network entry point",()=>{
    expect(networks).toContain("No Recovery Networks yet");
    expect(networks.match(/Set up a Recovery Network/g)).toHaveLength(1);
    expect(networks).toContain('<button ref={setupActionRef} type="button" className={styles.setupNetworkAction}');
    expect(networks).not.toContain("Set one up when you’re ready to give your audience another trusted way to find you.");
    expect(networks).toContain('<div className={styles.recoveryHeroContent}><p className="eyebrow">Build your safety net</p>');
    expect(networks).toContain("<p>Don’t leave your entire audience dependent on one platform. Build trusted recovery accounts so your community always has another way to find you.</p>{setupAction}");
    expect(networks).not.toContain("Add backup account");
    expect(networks.match(/className={styles.setupNetworkAction}/g)).toHaveLength(1);
    expect(networks.match(/No Recovery Networks yet/g)).toHaveLength(1);
    for(const contract of ["linear-gradient(120deg,#7c3aed","color:#fff","min-height:54px","align-self:center","translateY(-2px)","translateX(3px)","scale(1.06)",":active:not(:disabled)",":focus-visible","outline:3px solid #67e8f9","width:100%;min-height:56px","@media(prefers-reduced-motion:reduce)"])expect(css).toContain(contract);
  });

  it("renders an accessible, motion-safe social platform orbit around the empty-state shield",()=>{
    expect(networks).toContain("function RecoveryNetworkOrbit()");
    expect(networks).toContain('className={styles.recoveryOrbit} aria-hidden="true"');
    expect(networks).toContain("<span className={styles.orbitShield}><ShieldCheck/></span>");
    expect(networks).toContain("<PlatformBrandIcon provider={provider} label={provider}/>");
    for(const provider of ["youtube","instagram","facebook","tiktok","x","twitch","discord","snapchat"])expect(networks).toContain(`\"${provider}\"`);
    for(const contract of [".recoveryOrbit",".innerOrbit",".outerOrbit","orbitClockwise 22s","orbitCounterClockwise","animation-duration:32s",".orbitShield","shieldBreathe 5s","will-change:transform","@media(max-width:520px)","@media(prefers-reduced-motion:reduce){.orbitSatellite","animation:none"])expect(css).toContain(contract);
    expect(networks.match(/Set up a Recovery Network/g)).toHaveLength(1);
    expect(networks).toContain("if(pendingEmpty){setSetupRequested(true)");
    expect(networks).toContain('onConfigure("official")');
  });

  it("renders hierarchical recovery networks instead of parallel role columns",()=>{
    expect(manager).toContain("Manage accounts");
    expect(manager).toContain("Build your recovery network. Protect your audience beyond any single platform.");
    expect(manager).not.toContain("officialColumn");
    expect(manager).not.toContain("backupColumn");
    expect(networks).toContain("Your recovery networks");
    expect(networks).toContain("Recovery accounts");
  });

  it("uses one approved Recovery Networks page heading and moves the value proposition into the zero-state hero",()=>{
    expect(page).not.toContain("<h1>Platforms</h1>");
    expect(page).not.toContain("Protect what you’ve built. Give your audience trusted ways to find you if an account is hacked, suspended, blocked, or suddenly lost.");
    expect(networks).toContain('<p className="eyebrow">Your presence</p><h1>Your recovery networks</h1>');
    expect(networks).not.toContain("<h2>Your recovery networks</h2>");
    expect(networks).toContain("Don’t leave your entire audience dependent on one platform. Build trusted recovery accounts so your community always has another way to find you.");
    expect(networks).not.toContain("Each persistent Recovery Network keeps its destinations when you replace a Main account.");
    for(const contract of ["grid-template-columns:minmax(360px,45fr) minmax(0,55fr)","border:1px solid transparent","linear-gradient(120deg,rgba(192,132,252,.55)","width:400px","--orbit-radius:175px","@media(max-width:1100px)","@media(max-width:520px)"])expect(css).toContain(contract);
  });

  it("uses canonical entitlement limits instead of hard-coded capacity",()=>{
    expect(accountCapacityLabel(1,2)).toBe("1 of 2 used");
    expect(accountCapacityLabel(4,null)).toBe("Unlimited");
    expect(manager).toContain("entitlements.providerConnections.official.limit");
    expect(manager).toContain("entitlements.providerConnections.backup.limit");
  });

  it("passes the canonical Recovery Readiness model",()=>{
    expect(page).toContain("calculateRecoveryReadiness");
    for(const check of ["page:","pass:","official:","backup:","plan:"])expect(page).toContain(check);
    expect(manager).toContain("healthyRecoveryIds");
    expect(manager).toContain("everyMainProtected");
  });

  it("derives context-aware progress states",()=>{
    expect(configureAccountStepStates({officialCount:0,backupCount:0,blockingIssue:false,recoveryHealthy:false})).toEqual(["current","future","future"]);
    expect(configureAccountStepStates({officialCount:1,backupCount:0,blockingIssue:false,recoveryHealthy:false})).toEqual(["complete","current","future"]);
    expect(configureAccountStepStates({officialCount:1,backupCount:1,blockingIssue:false,recoveryHealthy:true})).toEqual(["complete","complete","complete"]);
    expect(manager).toContain("protectedMainCount");
  });

  it("uses network terminology in canonical guidance",()=>{
    expect(configureAccountGuidance({officialCount:0,backupCount:0,blockingIssue:false,recoveryHealthy:false}).action).toBe("Add Main account");
    expect(configureAccountGuidance({officialCount:1,backupCount:0,blockingIssue:false,recoveryHealthy:false}).action).toBe("Add Recovery destination");
    expect(configureAccountGuidance({officialCount:1,backupCount:1,blockingIssue:false,recoveryHealthy:true}).title).toBe("Your recovery networks are protected");
  });

  it("uses one three-step tracker without concatenated legacy text or duplicate first-run AI",()=>{
    for(const label of ["Main account","Recovery destinations","Protected"])expect(manager).toContain(`["${label}"`);
    expect(manager).not.toContain("Review protection");
    expect(manager).not.toContain("Stay protected");
    expect(manager).not.toContain("1Add Main account2Add Recovery destinations");
    expect(manager).toContain("savedOfficials.length>0&&!everyMainProtected");
    expect(networks).not.toContain("<aside><Sparkles");
  });

  it("shows canonical network health and native audience context",()=>{
    expect(networks).toContain("Connection needs attention");
    expect(networks).toContain("Needs Recovery account");
    expect(networks).toContain("Protected");
    expect(networks).toContain("native {m.audience_unit}");
  });

  it("renders exclusively linked and genuinely unassigned Recovery accounts from persistent networks",()=>{
    expect(networks).toContain("networks.flatMap(n=>n.recovery_account_ids)");
    expect(networks).toContain("n.recovery_account_ids.map");
    expect(networks).toContain("Unassigned Recovery accounts");
    expect(networks).toContain("Assign to {mains.find");
    expect(networks).toContain("recoveryAccountsEligibleForNetwork(accounts,networks,editing.network.id)");
    expect(networks).toContain("No Recovery accounts assigned yet.");
  });

  it("preserves secured existing-account assignment and contextual OAuth",()=>{
    expect(networks).toContain("savePersistentRecoveryNetwork");
    expect(networks).toContain("Your Recovery accounts");
    expect(networks).toContain("Connect a new Recovery account");
    expect(manager).toContain("recoveryNetworkId");
    expect(manager).toContain("ProviderConnectionMethodSelector");
  });

  it("keeps one Recovery CTA in the card and defers implementation choices",()=>{
    expect(networks).toContain("Add Recovery account");
    expect(networks).toContain('recoveries.length?open(n,null):onConfigure("backup",undefined,n.id)');
    expect(networks).not.toContain("Choose existing account");
    expect(networks).not.toContain("Connect new account");
    expect(networks).toContain("Your Recovery accounts");
  });

  it("centers the empty-Main setup and renders exactly one contextual Recovery CTA",()=>{
    for(const copy of ["Set up this Recovery Network","Add your Main account","Add Recovery accounts","Connect the account you want this Recovery Network to protect.","Give your audience trusted places to find you if your Main account becomes unavailable."])expect(networks).toContain(copy);
    expect(networks).toContain('linked.length?"Add another Recovery account":"Add Recovery account"');
    expect(networks).toContain('onConfigure("official",undefined,n.id)');
    for(const contract of [".setupContent","width:min(780px,100%)",".setupConnector",".emptyNetworkStatus",".mainSetupCta",".recoverySetupCta"])expect(css).toContain(contract);
  });

  it("keeps preserved Recovery cards inside an empty-Main network",()=>{
    expect(networks).toContain("linked.length>0&&<div className={styles.setupRecoveryCards}");
    expect(networks).toContain("linked.map(r=>");
    expect(networks).toContain("Delete Recovery account ${r.platform} · ${r.label}");
  });

  it("renders the same card-scoped action footer for every Main network state",()=>{
    const heading=networks.match(/mains\.length>0&&<header>[\s\S]*?<\/header>/)?.[0]??"";
    const networkFooter=networks.match(/<footer>[\s\S]*?<\/footer>/)?.[0]??"";
    expect(heading).not.toContain("Add another Main account");
    expect(networks.match(/Add another Main account/g)).toHaveLength(2);
    expect(networkFooter).toContain('<button className={styles.addAnotherRecovery} onClick={()=>open(n,m)}>');
    expect(networkFooter).toContain('<button className={styles.addMain} onClick={()=>onConfigure("official")}>');
    expect(networkFooter).toContain('aria-label={`Delete Main account ${m.platform} · ${m.label}`}');
    expect(networkFooter).toContain('onClick={()=>openMainDelete(m,n)}');
    expect(networkFooter).toContain("Add another Recovery account");
    expect(networkFooter).toContain("Delete Main account");
    expect(networkFooter).not.toContain("index===0");
    expect(networkFooter).not.toContain("index===0");
    expect(networks).toContain("visibleNetworks.map(n=>");
    expect(networks).toContain("Add Recovery account <ArrowRight/>");
    expect(css).toContain("flex-wrap:wrap");
    expect(css).toContain(".network>footer button,.addMain{width:100%;justify-content:center}");
  });

  it("polishes the account chooser without changing its canonical connection flows",()=>{
    for(const copy of ["Recovery Network","Protect ${editing.main.label}","Main account context","Your Recovery accounts","Select the accounts that should protect ${editing.main.label}.","Connect a new Recovery account","Expand your presence","Protect another account with its own Recovery Network."])expect(networks).toContain(copy);
    expect(networks).toContain('onConfigure("backup",mid,nid)');
    expect(networks).toContain('closeChooser();onConfigure("official");');
    expect(networks).toContain('selected.every(id=>editing.network.recovery_account_ids.includes(id))');
    expect(networks).toContain("setSelected(recoveryIdsAssignedToNetwork(networks,currentNetwork.id))");
    expect(networks).toContain("setSelected([])");
    expect(networks).toContain('aria-labelledby="recovery-chooser-title"');
    expect(networks).toContain('aria-label="Close Recovery account chooser"');
    for(const contract of [".networkChooser",".chooserMainContext",".chooserConnector",".recoveryChoice","rgba(34,211,238",".connectRecoveryCta",".addMainCta","rgba(167,139,250","@media(max-width:600px)","@media(prefers-reduced-motion:reduce)"])expect(css).toContain(contract);
    expect(css).toContain(".recoveryChoice:not(.checked)>svg:last-child{visibility:hidden;color:transparent}");
  });

  it("shows Recovery Network setup only after explicit intent and can cancel it",()=>{
    expect(networks).toContain("Set up a Recovery Network");
    expect(networks).toContain("disabled={!canCreateNetwork}");
    expect(networks).toContain("[setupRequested,setSetupRequested]=useState(false)");
    expect(networks).toContain("recoveryNetworksForPresentation(networks,setupRequested)");
    expect(networks).toContain("if(pendingEmpty)");
    expect(networks).toContain("setSetupRequested(true)");
    expect(networks).toContain("emptySetupRef.current?.scrollIntoView");
    expect(networks).toContain("emptySetupRef.current?.focus()");
    expect(networks).toContain('aria-label="Cancel Recovery Network setup"');
    expect(networks).toContain("setSetupRequested(false)");
    expect(networks).toContain("setupActionRef.current?.focus()");
    expect(networks).toContain('onConfigure("official")');
    expect(manager).toContain("canCreateNetwork={!officialLocked}");
    for(const contract of [".setupNetworkAction",".setupCancel","grid-column:1/-1","justify-self:center",".emptyNetwork:focus-visible","@media(max-width:680px)","@media(prefers-reduced-motion:reduce)"])expect(css).toContain(contract);
  });

  it("keeps manual save only when staged changes exist",()=>{
    expect(manager).toContain("dirty&&<form action={action}>");
    expect(manager).toContain("Save manual changes");
    expect(manager).toContain('aria-label="Close account management"');
    expect(manager).toContain('event.key==="Escape"');
    expect(manager).toContain("returnFocus.current?.focus()");
  });

  it("defines responsive, motion, and nested-card contracts",()=>{
    expect(css).toContain("grid-template-columns:repeat(2");
    expect(css).toContain("max-width:900px");
    expect(css).toContain("max-width:680px");
    expect(css).toContain("max-width:420px");
    expect(css).toContain("prefers-reduced-motion:reduce");
    expect(css).toContain("translateY(-2px)");
    expect(managerCss).toContain("grid-template-columns:repeat(3");
    expect(managerCss).toContain("stepcomplete");
  });
});
