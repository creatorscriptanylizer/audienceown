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
  for (const method of ["select", "eq", "order", "limit", "in", "maybeSingle"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function database(results: Record<string, unknown[]> = {}) {
  return { from: vi.fn((table: string) => query({ data: results[table] ?? [], error: null })) };
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
    expect(result.audience).toMatchObject({ protectedFans: null, fansAtRisk: null, protectedRatio: null, trend: [] });
    expect(result.recentOptIns).toEqual([]);
    expect(result.recoveryReadiness.checklist.length).toBeGreaterThan(0);
    expect(warning.mock.calls.flat().join(" ")).not.toContain("analytics_unavailable");
    warning.mockRestore();
  });

  it("renders zero protected fans but unavailable rates for a valid empty overview", async () => {
    const result = await getCreatorDashboard(creator);
    expect(result.audience).toEqual({ protectedFans: 0, fansAtRisk: 0, protectedRatio: null, trend: [] });
    expect(result.protection.score).toBe(0);
    expect(result.platforms).toHaveLength(12);
    expect(result.platforms.map((platform) => platform.provider)).toEqual(["youtube", "instagram", "tiktok", "x", "spotify", "twitch", "linkedin", "facebook", "snapchat", "threads", "pinterest", "discord"]);
    expect(result.platforms.every((platform) => !platform.connected)).toBe(true);
    expect(result.ecosystem).toMatchObject({ verifiedDestinations: 0, activeAutomations: 0, openIncidents: 0, health: "Setup available" });
    expect(result.emergency).toMatchObject({ activeEmergencyCount: 0, status: "No active emergency", lastDrillAt: null });
    expect(result.nextAction).toMatchObject({ label: "Publish your Recovery Page", href: "/dashboard/creator-page" });
  });

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

  it("uses typed fallbacks without leaking raw errors", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(safeDashboardSection("recent_opt_ins", async () => {
      throw new Error("private SQL response");
    }, [])).resolves.toEqual([]);
    expect(warning.mock.calls.flat().join(" ")).not.toContain("private SQL response");
    warning.mockRestore();
  });

  it("keeps a missing database client fatal", async () => {
    mocks.createClient.mockResolvedValue(null);
    await expect(getCreatorDashboard(creator)).rejects.toThrow("dashboard_unavailable");
  });
});
