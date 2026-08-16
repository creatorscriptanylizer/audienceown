import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  recoveryAnalyticsOverview: vi.fn(),
  recoveryTrend: vi.fn(),
  liveRecoveryAnalytics: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/recovery-analytics-server", () => ({
  recoveryAnalyticsOverview: mocks.recoveryAnalyticsOverview,
  recoveryTrend: mocks.recoveryTrend,
  liveRecoveryAnalytics: mocks.liveRecoveryAnalytics,
}));

import { getCreatorDashboard, safeDashboardSection } from "@/lib/dashboard/creator-dashboard";
import type { Creator } from "@/lib/database.helpers";

function query(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "in", "or", "maybeSingle"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function database(results: Record<string, unknown[]> = {}, rpcResults: Record<string, unknown> = {}) {
  return { from: vi.fn((table: string) => query({ data: results[table] ?? [], error: null })), rpc: vi.fn((name: string) => Promise.resolve({ data: name in rpcResults ? rpcResults[name] : name === "get_creator_protected_fan_count" ? 0 : [], error: null })) };
}

const creator = {
  id: "creator-id",
  display_name: "New Creator",
  public_slug: "new-creator",
  public_profile_enabled: false,
  recovery_pass_enabled: false,
} as Creator;

describe("creator dashboard data isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recoveryAnalyticsOverview.mockResolvedValue({
      total_relationships: 0, recovery_ready_relationships: 0,
      uncovered_relationships: 0, partially_configured_relationships: 0,
      recovery_coverage_rate: null, change_vs_previous_snapshot: null,
      last_snapshot_at: null, availability: "empty",
    });
    mocks.recoveryTrend.mockResolvedValue([]);
    mocks.createClient.mockResolvedValue(database());
  });

  it("keeps successful sections when recovery analytics fails", async () => {
    mocks.recoveryAnalyticsOverview.mockRejectedValue(new Error("analytics_unavailable"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await getCreatorDashboard(creator);
    expect(result.audience).toMatchObject({ protectedFans: 0, fansAtRisk: null, protectedRatio: null, trend: [] });
    expect(result.recentOptIns).toEqual([]);
    expect(result.recoveryReadiness.checklist.length).toBeGreaterThan(0);
    expect(warning.mock.calls.flat().join(" ")).not.toContain("analytics_unavailable");
    warning.mockRestore();
  });

  it("loads the Updates summary only through creator-scoped reads", async () => {
    const db = database({
      creator_updates: [{ id:"update-1", broadcast_type:"new_content", broadcast_intent:"new_video", status:"queued", title:"Studio tour", scheduled_for:null, sent_at:null, queued_at:"2026-08-15T09:00:00Z", updated_at:"2026-08-15T09:00:00Z", affected_platform_connection_id:null, source_provider:null }],
      update_deliveries: [{ update_id:"update-1", contact_id:"private-fan-id", transport:"email", status:"delivered", accepted_at:"2026-08-15T09:01:00Z", delivered_at:"2026-08-15T09:02:00Z" }],
    });
    mocks.createClient.mockResolvedValue(db);
    const result = await getCreatorDashboard(creator);
    expect(result.audienceUpdates).toMatchObject({ updatesSent:1, audienceReached:1 });
    expect(JSON.stringify(result.audienceUpdates)).not.toContain("private-fan-id");
    const scopedCalls = (db.from as ReturnType<typeof vi.fn>).mock.results
      .filter((entry) => entry.value && typeof entry.value === "object")
      .map((entry) => entry.value as { eq: ReturnType<typeof vi.fn> });
    expect(scopedCalls.some((chain) => chain.eq.mock.calls.some((call) => call[0] === "creator_id" && call[1] === creator.id))).toBe(true);
  });

  it("renders zero protected fans but unavailable rates for a valid empty overview", async () => {
    const result = await getCreatorDashboard(creator);
    expect(result.audience).toEqual({ protectedFans: 0, fansAtRisk: 0, protectedRatio: null, trend: [] });
    expect(result.protection.score).toBe(0);
    expect(result.platforms).toHaveLength(11);
    expect(result.platforms.map((platform) => platform.provider)).toEqual(["youtube", "instagram", "tiktok", "x", "spotify", "twitch", "linkedin", "facebook", "snapchat", "pinterest", "discord"]);
    expect(result.platforms.every((platform) => !platform.connected)).toBe(true);
    expect(result.ecosystem).toMatchObject({ verifiedDestinations: 0, activeAutomations: 0, openIncidents: 0, health: "Setup available" });
    expect(result.emergency).toMatchObject({ activeEmergencyCount: 0, status: "No active emergency", lastDrillAt: null });
    expect(result.recoveryPass).toEqual({ exists:false, active:false, canonicalUrl:null, displayUrl:null, href:"/onboarding/recovery-pass" });
    expect(result.recoveryReadiness).toMatchObject({availability:"available",score:0,state:"Not configured"});
    expect(result.nextAction).toMatchObject({ label: "Publish your Recovery Page", href: "/dashboard/creator-page" });
  });

  it("projects the persisted Recovery Pass slug and public state without another query",async()=>{const result=await getCreatorDashboard({...creator,public_profile_enabled:true,recovery_pass_enabled:true});expect(result.recoveryPass).toEqual({exists:true,active:true,canonicalUrl:"https://audienceown.com/new-creator",displayUrl:"audienceown.com/new-creator",href:"/new-creator"})});

  it("discovers connected and official providers without exposing stable IDs", async () => {
    mocks.createClient.mockResolvedValue(database({
      connected_accounts: [{ id: "private-connection-id", platform: "youtube", account_type: "official", label: "Channel", connection_health: "healthy", provider_status: "ready", last_sync_at: null, created_at: "2026-08-02" }],
      creator_identity_accounts: [{ provider: "instagram", verification_status: "verified", official: true, account_kind: "creator_account", stable_provider_account_id: "must-not-leak" }],
      provider_asset_bindings: [{ connected_account_id: "private-connection-id", provider: "facebook", verification_status: "verified", authority_status: "authorized", last_successful_sync_at: null, stable_asset_id: "must-not-leak" }],
    }));
    const result = await getCreatorDashboard(creator);
    expect(result.platforms.find((platform) => platform.provider === "youtube")).toMatchObject({ connected: true, audienceCount: null });
    expect(result.platforms.find((platform) => platform.provider === "instagram")).toMatchObject({ connected: true, verified: true });
    expect(result.platforms.find((platform) => platform.provider === "facebook")).toMatchObject({ connected: true, verified: true });
    expect(JSON.stringify(result)).not.toContain("private-connection-id");
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("uses the shared metric-independent account read and keeps a newly connected account active", async () => {
    const db = database({ connected_accounts: [{ id: "new-account", platform: "youtube", account_type: "official", label: "New channel", is_primary: true, connection_health: "healthy", provider_status: "ready" }] });
    mocks.createClient.mockResolvedValue(db);
    const result = await getCreatorDashboard(creator);
    expect(result.platforms.find((platform) => platform.provider === "youtube")).toMatchObject({ connected: true, audienceCount: null });
    expect(result.mainAudience).toMatchObject({ provider: "youtube", displayName: "New channel", audienceCount: null });
    expect(result.mainAccountState).toBe("selected");
    expect(db.from).toHaveBeenCalledWith("connected_accounts");
  });

  it("prefers the official provider metric when the same provider also has a backup metric", async () => {
    const db = database({
      connected_accounts: [{ id:"main", platform:"youtube", account_type:"official", label:"Main channel", is_primary:true, connection_health:"healthy", provider_status:"ready" }],
      provider_audience_metrics: [
        { provider:"youtube", account_category:"backup", audience_count:null, audience_unit:"subscribers", status:"not_synced", approximate:false, source_observed_at:null },
        { connection_id:"main", provider:"youtube", account_category:"official", audience_count:842, audience_unit:"subscribers", status:"available", approximate:true, source_observed_at:"2026-08-02T10:00:00Z" },
      ],
    });
    mocks.createClient.mockResolvedValue(db);
    const result = await getCreatorDashboard(creator);
    expect(result.mainAudience).toMatchObject({ provider:"youtube", audienceCount:842, status:"available" });
  });

  it("does not leak a backup YouTube metric into the official account", async () => {
    const db = database({
      connected_accounts: [
        { id:"main", platform:"youtube", account_type:"official", label:"Main", is_primary:true, connection_health:"healthy", provider_status:"ready" },
        { id:"backup", platform:"youtube", account_type:"backup", label:"Backup", is_primary:false, connection_health:"healthy", provider_status:"ready" },
      ],
      provider_audience_metrics: [{ connection_id:"backup", provider:"youtube", account_category:"backup", audience_count:9999, audience_unit:"subscribers", status:"available", approximate:true, source_observed_at:"2026-08-02T10:00:00Z" }],
    });
    mocks.createClient.mockResolvedValue(db);
    const result = await getCreatorDashboard(creator);
    expect(result.mainAudience).toMatchObject({ displayName:"Main", audienceCount:null });
  });

  it("projects backups onto the exact protected official and leaves only null links unassigned", async () => {
    mocks.createClient.mockResolvedValue(database({
      connected_accounts: [
        { id:"official-a", platform:"youtube", account_type:"official", label:"Official A", is_primary:true, connection_health:"healthy", provider_status:"ready" },
        { id:"official-b", platform:"youtube", account_type:"official", label:"Official B", connection_health:"healthy", provider_status:"ready" },
        { id:"backup-a1", platform:"youtube", account_type:"backup", label:"Backup A1", protected_official_account_id:"official-a", connection_health:"healthy", provider_status:"ready" },
        { id:"backup-a2", platform:"youtube", account_type:"backup", label:"Backup A2", protected_official_account_id:"official-a", connection_health:"healthy", provider_status:"ready" },
        { id:"backup-b", platform:"youtube", account_type:"backup", label:"Backup B", protected_official_account_id:"official-b", connection_health:"healthy", provider_status:"ready" },
        { id:"backup-null", platform:"youtube", account_type:"backup", label:"Needs assignment", protected_official_account_id:null, connection_health:"healthy", provider_status:"ready" },
        { id:"backup-revoked", platform:"youtube", account_type:"backup", label:"Revoked", protected_official_account_id:"official-a", connection_health:"revoked", provider_status:"revoked" },
      ],
      provider_audience_metrics: [
        { connection_id:"official-a", provider:"youtube", account_category:"official", audience_count:10, audience_unit:"subscribers", status:"available" },
        { connection_id:"official-b", provider:"youtube", account_category:"official", audience_count:20, audience_unit:"subscribers", status:"available" },
        { connection_id:"backup-a1", provider:"youtube", account_category:"backup", audience_count:99, audience_unit:"subscribers", status:"available" },
      ],
    }));
    const result=await getCreatorDashboard(creator);
    expect(result.dashboardAccounts.map((account)=>account.displayName)).toEqual(["Official A","Official B"]);
    expect(result.dashboardAccounts[0].linkedBackups.map((account)=>account.displayName)).toEqual(["Backup A1","Backup A2","Backup B","Needs assignment"]);
    expect(result.dashboardAccounts[1].linkedBackups).toEqual([]);
    expect(result.unassignedBackups).toEqual([]);
    expect(JSON.stringify(result.dashboardAccounts)).not.toContain("Revoked");
    expect(result.nativeOfficialAudience).toBe(30);
    expect(result.nativeOfficialAudienceAccountCount).toBe(2);
  });

  it("keeps a disconnected backup nested without changing its official status",async()=>{
    mocks.createClient.mockResolvedValue(database({connected_accounts:[
      {id:"official",platform:"youtube",account_type:"official",label:"Main",is_primary:true,connection_health:"healthy",provider_status:"ready"},
      {id:"backup",platform:"youtube",account_type:"backup",label:"Offline backup",protected_official_account_id:"official",connection_health:"disconnected",provider_status:"disconnected"},
    ]}));
    const result=await getCreatorDashboard(creator);
    expect(result.dashboardAccounts[0]).toMatchObject({displayName:"Main",connectionLabel:"Connected"});
    expect(result.dashboardAccounts[0].linkedBackups[0]).toMatchObject({displayName:"Offline backup",connectionLabel:"Disconnected"});
    expect(result.unassignedBackups).toEqual([]);
  });

  it("keeps a Backup in the creator hierarchy across Main removal and cross-provider replacement",async()=>{
    const rows=[
      {id:"official",platform:"youtube",account_type:"official",label:"Main",is_primary:true,connection_health:"healthy",provider_status:"ready"},
      {id:"backup",platform:"youtube",account_type:"backup",label:"Fallback",protected_official_account_id:null as string|null,connection_health:"healthy",provider_status:"ready"},
    ];
    mocks.createClient.mockResolvedValue(database({connected_accounts:rows}));
    const before=await getCreatorDashboard(creator);
    expect(before.dashboardAccounts[0].linkedBackups.map((account)=>account.displayName)).toEqual(["Fallback"]);
    expect(before.unassignedBackups).toEqual([]);

    mocks.createClient.mockResolvedValue(database({connected_accounts:[rows[1]]}));
    const withoutMain=await getCreatorDashboard(creator);
    expect(withoutMain.mainAccountState).toBe("selection_required");
    expect(withoutMain.unassignedBackups.map((account)=>account.displayName)).toEqual(["Fallback"]);

    const replacement={id:"new-main",platform:"x",account_type:"official",label:"New Main",is_primary:true,connection_health:"healthy",provider_status:"ready"};
    mocks.createClient.mockResolvedValue(database({connected_accounts:[rows[1],replacement]}));
    const after=await getCreatorDashboard(creator);
    expect(after.mainAudience?.displayName).toBe("New Main");
    expect(after.dashboardAccounts.find((account)=>account.displayName==="New Main")?.linkedBackups.map((account)=>account.displayName)).toEqual(["Fallback"]);
    expect(after.unassignedBackups).toEqual([]);
  });

  it("resolves a backup YouTube metric by its exact connection id", async () => {
    mocks.createClient.mockResolvedValue(database({
      connected_accounts: [{ id:"backup-exact", platform:"youtube", account_type:"backup", label:"Lineconomy", is_primary:false, external_account_id:"channel-lineconomy", connection_health:"healthy", provider_status:"ready", last_sync_at:"2026-08-02T10:00:00Z" }],
      creator_identity_accounts: [{ source_connection_id:"backup-exact", provider:"youtube", display_name:"Lineconomy", verification_status:"verified", official:false, account_kind:"channel" }],
      provider_audience_metrics: [
        { connection_id:"different-backup", provider:"youtube", account_category:"backup", audience_count:9999, audience_unit:"subscribers", status:"available", approximate:false, source_observed_at:"2026-08-02T09:00:00Z" },
        { connection_id:"backup-exact", provider:"youtube", account_category:"backup", audience_count:321, audience_unit:"subscribers", status:"available", approximate:false, source_observed_at:"2026-08-02T10:00:00Z" },
      ],
    }));
    const result = await getCreatorDashboard(creator);
    expect(result.recoveryDestinations[0]).toMatchObject({ displayName:"Lineconomy", verificationState:"verified", recoveryPassOptIns:0, nativeAudience:321, nativeAudienceUnit:"subscribers", href:"/dashboard/platforms" });
  });

  it("uses one projection for configured main and backup accounts on the same provider", async () => {
    const db = database({ connected_accounts: [
      { id:"main-private", platform:"youtube", account_type:"official", label:"@Animated829", url:"https://youtube.com/@Animated829", is_primary:true, is_public:true, connection_health:"disconnected", provider_status:"configuration_pending" },
      { id:"backup-private", platform:"youtube", account_type:"backup", label:"@SmartMoneyGenZ-i6l", url:"https://youtube.com/@SmartMoneyGenZ-i6l", is_primary:false, is_public:true, connection_health:"disconnected", provider_status:"configuration_pending" },
    ] }, { get_creator_recovery_destination_breakdown: [
      { destination_id:"backup-private", provider:"youtube", display_name:"@SmartMoneyGenZ-i6l", display_handle:null, role:"backup", verification_state:"unverified", opted_in_fan_count:0, coverage_percent:null, synchronized_at:null, href:"/dashboard/platforms" },
    ] });
    mocks.createClient.mockResolvedValue(db);
    const result = await getCreatorDashboard(creator);
    expect(result.mainAccountState).toBe("selected");
    expect(result.mainAudience).toMatchObject({ provider:"youtube", displayName:"@Animated829", handle:"@Animated829", audienceCount:null, connection:{ connected:true, verified:false } });
    expect(result.recoveryDestinations).toHaveLength(1);
    expect(result.recoveryDestinations[0]).toMatchObject({ provider:"youtube", displayName:"@SmartMoneyGenZ-i6l", role:"backup", recoveryPassOptIns:0 });
    expect(result.recoveryDestinations[0].displayName).not.toBe(result.mainAudience?.displayName);
    expect(JSON.stringify(result)).not.toContain("main-private");
    expect(result.recoveryDestinations[0].href).toBe("/dashboard/platforms");
  });

  it("uses typed fallbacks without leaking raw errors", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(safeDashboardSection("recent_opt_ins", async () => {
      throw new Error("private SQL response");
    }, [])).resolves.toEqual([]);
    expect(warning.mock.calls.flat().join(" ")).not.toContain("private SQL response");
    warning.mockRestore();
  });

  it("keeps native main and backup audience counts out of Recovery Pass totals and growth", async () => {
    const db = database({
      connected_accounts: [
        { id:"official", platform:"instagram", account_type:"official", label:"Official", connection_health:"healthy", provider_status:"ready" },
        { id:"backup", platform:"instagram", account_type:"backup", label:"Backup", connection_health:"healthy", provider_status:"ready" },
      ],
      provider_audience_metrics: [
        { connection_id:"official", provider:"instagram", account_category:"official", audience_count:8000, audience_unit:"followers", status:"available" },
        { connection_id:"backup", provider:"instagram", account_category:"backup", audience_count:12000, audience_unit:"followers", status:"available" },
      ],
    }, {
      get_creator_recovery_audience_summary: { protectedAudience:1, recoveryConnections:1, recoveryDestinations:1, growth:{ range:"30d", historySource:"recovery_pass_destination_selected_at", points:[{ date:"2026-08-14", protectedAudience:1, recoveryConnections:1 }] } },
      get_creator_recovery_destination_breakdown: [{ destination_id:"backup", provider:"instagram", display_name:"Backup", role:"backup", verification_state:"verified", opted_in_fan_count:1, synchronized_at:null, href:"/dashboard/platforms" }],
    });
    mocks.createClient.mockResolvedValue(db);
    const result = await getCreatorDashboard(creator);
    expect(result.recoveryAudience).toMatchObject({ protectedAudience:1, recoveryConnections:1 });
    expect(result.recoveryDestinations[0]).toMatchObject({ recoveryPassOptIns:1, nativeAudience:12000 });
    expect(result.nativeOfficialAudience).toBe(8000);
    expect(JSON.stringify(result.recoveryAudience)).not.toContain("8000");
    expect(JSON.stringify(result.recoveryAudience)).not.toContain("12000");
  });

  it("surfaces a missing Recovery Audience RPC safely and never substitutes native metrics", async () => {
    const db = database({
      connected_accounts: [{ id:"official", platform:"youtube", account_type:"official", label:"Main", connection_health:"healthy", provider_status:"ready" }],
      provider_audience_metrics: [{ connection_id:"official", provider:"youtube", account_category:"official", audience_count:987654, audience_unit:"subscribers", status:"available" }],
    });
    (db as { rpc: unknown }).rpc = vi.fn((name: string) => Promise.resolve(name === "get_creator_recovery_audience_summary"
      ? { data:null, error:{ code:"PGRST202", message:"Could not find the function in the schema cache" } }
      : { data:[], error:null }));
    mocks.createClient.mockResolvedValue(db);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await getCreatorDashboard(creator);
    expect(result.recoveryAudience).toMatchObject({ protectedAudience:0, recoveryConnections:0, recoveryDestinations:0 });
    expect(result.availability.recoveryAudience).toEqual({ status:"unavailable", reason:"query_failed" });
    expect(result.availability.recoveryDestinations).toEqual({ status:"available" });
    expect(result.nativeOfficialAudience).toBe(987654);
    expect(JSON.stringify(result.recoveryAudience)).not.toContain("987654");
    expect(warning.mock.calls.flat().join(" ")).toContain('"source":"get_creator_recovery_audience_summary"');
    expect(warning.mock.calls.flat().join(" ")).toContain('"code":"PGRST202"');
    warning.mockRestore();
  });

  it("keeps successful zero recovery and updates results explicitly available", async () => {
    const result = await getCreatorDashboard(creator);
    expect(result.recoveryAudience).toMatchObject({ protectedAudience:0, recoveryConnections:0, recoveryDestinations:0 });
    expect(result.audienceUpdates).toMatchObject({ updatesSent:0, audienceReached:0, drafts:0, nextScheduled:null, recent:[] });
    expect(result.availability).toMatchObject({
      recoveryAudience:{ status:"available" },
      recoveryDestinations:{ status:"available" },
      audienceUpdates:{ status:"available" },
    });
  });

  it("marks only Audience Updates unavailable when its query fails", async () => {
    const db = database();
    const originalFrom = db.from;
    db.from = vi.fn((table: string) => table === "creator_updates"
      ? query({ data:null, error:{ code:"PGRST500", message:"failure for test@example.com" } })
      : originalFrom(table));
    mocks.createClient.mockResolvedValue(db);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await getCreatorDashboard(creator);
    expect(result.availability.recoveryAudience).toEqual({ status:"available" });
    expect(result.availability.audienceUpdates).toEqual({ status:"unavailable", reason:"query_failed" });
    expect(result.audienceUpdates).toMatchObject({ updatesSent:0, audienceReached:0, drafts:0 });
    expect(warning.mock.calls.flat().join(" ")).not.toContain("test@example.com");
    expect(warning.mock.calls.flat().join(" ")).toContain("[email]");
    warning.mockRestore();
  });

  it("keeps a missing database client fatal", async () => {
    mocks.createClient.mockResolvedValue(null);
    await expect(getCreatorDashboard(creator)).rejects.toThrow("dashboard_unavailable");
  });
});
