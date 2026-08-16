import{describe,expect,it}from"vitest";
import{canProtectBackup}from"@/lib/social-providers/account-relationships";
import{canonicalAccountConnected,resolveConnectionStatus}from"@/lib/social-providers/connection-health";
import{getPlatform}from"@/lib/platforms";

const account=(overrides:Partial<{id:string;creator_id:string;platform:string;account_type:string;url:string|null;external_account_id:string|null;connection_health:string;provider_status:string}>={})=>({id:"official",creator_id:"creator-a",platform:"youtube",account_type:"official",url:"https://youtube.com/@main",external_account_id:null,connection_health:"disconnected",provider_status:"configuration_pending",...overrides});

describe("manual and OAuth account unification",()=>{
  it("uses canonical provider values for manual persistence",()=>{
    for(const provider of["youtube","spotify","linkedin","snapchat","pinterest"] as const)expect(getPlatform(provider)?.databaseValue).toBe(provider);
  });

  it("projects accepted manual lifecycle as Connected without inventing authorization",()=>{
    const connected=canonicalAccountConnected({health:"disconnected",providerStatus:"configuration_pending",hasPublicUrl:true,hasExternalAccountId:false});
    expect(connected).toBe(true);
    expect(resolveConnectionStatus({health:"disconnected",providerStatus:"configuration_pending",canonicalConnected:connected})).toMatchObject({connectionLabel:"Connected",connectionTone:"success"});
  });

  it.each([
    ["manual official + OAuth backup",null,"oauth-backup"],
    ["OAuth official + manual backup","provider-official",undefined],
    ["manual official + manual backup",null,undefined],
    ["OAuth official + OAuth backup","provider-official","oauth-backup"],
  ])("accepts %s through the same relationship rule",(_label,officialExternalId,backupId)=>{
    expect(canProtectBackup({backupId,backupCreatorId:"creator-a",backupProvider:"youtube",backupRole:"backup",target:account({external_account_id:officialExternalId,connection_health:officialExternalId?"healthy":"disconnected",provider_status:officialExternalId?"ready":"configuration_pending"})})).toBe(true);
  });

  it("rejects cross-provider, cross-creator, self, and backup targets",()=>{
    const base={backupId:"backup",backupCreatorId:"creator-a",backupProvider:"youtube",backupRole:"backup"};
    expect(canProtectBackup({...base,target:account({platform:"instagram"})})).toBe(false);
    expect(canProtectBackup({...base,target:account({creator_id:"creator-b"})})).toBe(false);
    expect(canProtectBackup({...base,target:account({id:"backup"})})).toBe(false);
    expect(canProtectBackup({...base,target:account({account_type:"backup"})})).toBe(false);
  });

  it("does not let missing or expired credentials redefine a still-active manual lifecycle",()=>{
    expect(canonicalAccountConnected({health:"disconnected",providerStatus:"configuration_pending",hasPublicUrl:true,hasExternalAccountId:false})).toBe(true);
    expect(canonicalAccountConnected({health:"expired",providerStatus:"ready",hasPublicUrl:true,hasExternalAccountId:true})).toBe(false);
    expect(canonicalAccountConnected({health:"revoked",providerStatus:"ready",hasPublicUrl:true,hasExternalAccountId:true})).toBe(false);
  });
});
