import { describe, expect, it } from "vitest";
import { createCreatorAccountProjection, creatorConnectionProjectionState, normalizeCreatorAccountRole, resolveCreatorBackups, resolveCreatorMain } from "@/lib/social-providers/creator-account-projection";

describe("shared creator account projection", () => {
  it("uses one active-state decision for dashboard and account configuration",()=>{
    const main={id:"main",platform:"youtube",account_type:"official",label:"Smart Money Gen Z",url:"https://youtube.com/@main",is_primary:true,connection_health:"revoked",provider_status:"configuration_pending"};
    const backup={id:"backup",platform:"youtube",account_type:"backup",label:"Lineconomy",url:"https://youtube.com/@backup",is_primary:false,connection_health:"healthy",provider_status:"ready"};
    expect(creatorConnectionProjectionState(main,[],[]).active).toBe(false);
    expect(creatorConnectionProjectionState(backup,[],[]).active).toBe(true);
    const projection=createCreatorAccountProjection("creator-a",[main,backup],[],[]);
    expect(projection.find(account=>account.displayName==="Smart Money Gen Z")?.connected).toBe(false);
    expect(projection.find(account=>account.displayName==="Lineconomy")?.connected).toBe(true);
  });
  it("projects the same connected YouTube account for Platforms and Dashboard consumers", () => {
    const projection = createCreatorAccountProjection("creator-a", [{ id: "connection-private", platform: "youtube", account_type: "official", label: "Main channel", url: "https://youtube.com/@main", is_primary: true, connection_health: "healthy", provider_status: "ready" }], [], []);
    const platformsConnected = projection.some((account) => account.provider === "youtube" && account.connected);
    const dashboardMain = projection.find((account) => account.provider === "youtube" && account.role === "official" && account.connected);
    expect(platformsConnected).toBe(true);
    expect(dashboardMain).toMatchObject({ displayName: "Main channel", primary: true, connected: true });
    expect(JSON.stringify(projection)).not.toContain("connection-private");
  });

  it("projects persisted YouTube and Instagram official connections together",()=>{
    const projection=createCreatorAccountProjection("creator-a",[
      {id:"youtube-private",platform:"youtube",account_type:"official",label:"Main channel",url:"https://youtube.com/@main",external_account_id:"youtube-provider-id",connection_health:"healthy",provider_status:"ready"},
      {id:"instagram-private",platform:"instagram",account_type:"official",label:"@nana_friggy",url:"https://instagram.com/nana_friggy/",external_account_id:"instagram-provider-id",connection_health:"healthy",provider_status:"app_review_required"},
    ],[],[]);
    expect(projection.map(({provider,role,connected})=>({provider,role,connected}))).toEqual([
      {provider:"youtube",role:"official",connected:true},
      {provider:"instagram",role:"official",connected:true},
    ]);
    expect(projection[1]).toMatchObject({displayName:"@nana_friggy",handle:"@nana_friggy",role:"official",connected:true});
  });

  it("keeps two accounts on one provider separate", () => {
    const projection = createCreatorAccountProjection("creator-a", [
      { id: "main", platform: "youtube", account_type: "official", label: "Main", url: null, is_primary: true, connection_health: "healthy" },
      { id: "backup", platform: "youtube", account_type: "backup", label: "Backup", url: null, connection_health: "healthy" },
    ], [], []);
    expect(projection).toHaveLength(2);
    expect(projection.map((account) => account.role)).toEqual(["official", "backup"]);
    expect(new Set(projection.map((account) => account.accountKey)).size).toBe(2);
  });

  it("does not treat an unavailable metric as a disconnected account", () => {
    const [account] = createCreatorAccountProjection("creator-a", [{ id: "youtube", platform: "youtube", account_type: "official", label: "Channel", url: null, connection_health: "healthy" }], [], []);
    expect(account).toMatchObject({ connected: true, verified: false });
  });

  it("recognizes configured main and backup rows before provider synchronization", () => {
    const projection = createCreatorAccountProjection("creator-a", [
      { id: "main-private", platform: "youtube", account_type: "official", label: "@Animated829", url: "https://youtube.com/@Animated829", is_primary: true, connection_health: "disconnected", provider_status: "configuration_pending" },
      { id: "backup-private", platform: "youtube", account_type: "backup", label: "@SmartMoneyGenZ-i6l", url: "https://youtube.com/@SmartMoneyGenZ-i6l", is_primary: false, connection_health: "disconnected", provider_status: "configuration_pending" },
    ], [], []);
    expect(projection).toHaveLength(2);
    expect(projection[0]).toMatchObject({ displayName:"@Animated829", handle:"@Animated829", role:"official", primary:true, connected:true, verified:false });
    expect(projection[1]).toMatchObject({ displayName:"@SmartMoneyGenZ-i6l", handle:"@SmartMoneyGenZ-i6l", role:"backup", primary:false, connected:true, verified:false });
    expect(projection[1].role).not.toBe("official");
    expect(JSON.stringify(projection)).not.toContain("main-private");
    expect(JSON.stringify(projection)).not.toContain("backup-private");
  });

  it("treats an accepted manual account as connected while keeping authorization provenance manual",()=>{
    const[row]=createCreatorAccountProjection("creator-a",[{id:"manual",platform:"youtube",account_type:"official",label:"Manual main",url:"https://youtube.com/@manual",external_account_id:null,connection_health:"disconnected",provider_status:"configuration_pending"}],[],[]);
    expect(row).toMatchObject({connected:true,connectionType:"manual",connectionHealth:"manual"});
  });

  it("keeps an explicitly disconnected provider connection disconnected", () => {
    const [account] = createCreatorAccountProjection("creator-a", [{ id:"oauth-private", platform:"youtube", account_type:"official", label:"Channel", url:"https://youtube.com/@channel", is_primary:true, external_account_id:"provider-private", connection_health:"disconnected", provider_status:"ready" }], [], []);
    expect(account).toMatchObject({connected:false,connectionHealth:"disconnected",connectionType:"oauth"});
  });

  it("projects connection health and freshness for every dashboard consumer",()=>{const [account]=createCreatorAccountProjection("creator-a",[{id:"oauth",platform:"youtube",account_type:"official",label:"Channel",url:null,external_account_id:"external",connection_health:"healthy",last_sync_at:"2026-08-07T10:00:00Z"}],[],[]);expect(account).toMatchObject({connectionHealth:"healthy",lastSynchronizedAt:"2026-08-07T10:00:00Z",connectionType:"oauth"});});

  it("normalizes supported role aliases without promoting backups", () => {
    expect(["official", "main", "primary"].map((accountType) => normalizeCreatorAccountRole({ accountType }))).toEqual(["official", "official", "official"]);
    expect(normalizeCreatorAccountRole({ accountType:"backup", primary:true, official:true })).toBe("backup");
    expect(normalizeCreatorAccountRole({ accountType:"emergency_replacement" })).toBe("emergency_replacement");
    expect(normalizeCreatorAccountRole({ accountType:"recovery_destination" })).toBe("recovery_destination");
  });

  it("keeps creator-owned Backups stable while Main disappears and changes provider", () => {
    const rows = [
      { id:"youtube-main", platform:"youtube", account_type:"official", label:"YouTube", url:null, is_primary:true, connection_health:"healthy", provider_status:"ready" },
      { id:"instagram-backup", platform:"instagram", account_type:"backup", label:"Instagram", url:null, connection_health:"healthy", provider_status:"ready" },
      { id:"discord-backup", platform:"discord", account_type:"backup", label:"Discord", url:null, connection_health:"disconnected", provider_status:"ready" },
      { id:"tiktok-backup", platform:"tiktok", account_type:"backup", label:"TikTok", url:null, connection_health:"healthy", provider_status:"ready" },
    ];
    const initial=createCreatorAccountProjection("creator-a",rows,[],[]);
    const backupKeys=resolveCreatorBackups(initial).map((account)=>account.accountKey);
    expect(resolveCreatorMain(initial)?.provider).toBe("youtube");
    expect(resolveCreatorBackups(initial).map((account)=>account.provider)).toEqual(["instagram","discord","tiktok"]);

    const withoutMain=createCreatorAccountProjection("creator-a",rows.slice(1),[],[]);
    expect(resolveCreatorMain(withoutMain)).toBeNull();
    expect(resolveCreatorBackups(withoutMain).map((account)=>account.accountKey)).toEqual(backupKeys);
    expect(resolveCreatorBackups(withoutMain).every((account)=>account.role==="backup")).toBe(true);

    const replacement=createCreatorAccountProjection("creator-a",[...rows.slice(1),{ id:"x-main", platform:"x", account_type:"official", label:"X", url:null, is_primary:true, connection_health:"healthy", provider_status:"ready" }],[],[]);
    expect(resolveCreatorMain(replacement)?.provider).toBe("x");
    expect(resolveCreatorBackups(replacement).map((account)=>account.accountKey)).toEqual(backupKeys);
  });
});
