import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { recoveryAnalyticsOverview, recoveryIncidents, recoveryUpdate } from "@/lib/recovery-analytics-server";

describe("recoveryAnalyticsOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc, from: mocks.from });
  });

  it("returns an authoritative empty overview when the RPC returns no rows", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    await expect(recoveryAnalyticsOverview()).resolves.toEqual({
      total_relationships: 0,
      recovery_ready_relationships: 0,
      uncovered_relationships: 0,
      partially_configured_relationships: 0,
      recovery_coverage_rate: null,
      change_vs_previous_snapshot: null,
      last_snapshot_at: null,
      availability: "empty",
    });
  });

  it("logs only a safe warning and preserves strict failure on database errors", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "private SQL and contact@example.com" } });
    await expect(recoveryAnalyticsOverview()).rejects.toThrow("analytics_unavailable");
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('"category":"database_error"'));
    expect(warning.mock.calls.flat().join(" ")).not.toContain("private SQL");
    expect(warning.mock.calls.flat().join(" ")).not.toContain("contact@example.com");
    warning.mockRestore();
  });

  it("distinguishes available, absent, query-failed, and permission-failed update details", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { id: "update-1", transport_breakdown: {}, provider_breakdown: {} }, error: null });
    await expect(recoveryUpdate("update-1")).resolves.toMatchObject({ status: "available", data: { id: "update-1" } });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(recoveryUpdate("missing")).resolves.toEqual({ status: "absent", data: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "offline" } });
    await expect(recoveryUpdate("broken")).resolves.toEqual({ status: "unavailable", reason: "query_failed", data: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denied" } });
    await expect(recoveryUpdate("denied")).resolves.toEqual({ status: "unavailable", reason: "query_failed", data: null });
  });

  it("distinguishes an authoritative empty incident list from query failure", async () => {
    const limit = vi.fn().mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    const order = vi.fn(() => ({ limit }));
    const inFilter = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ in: inFilter }));
    mocks.from.mockReturnValue({ select });
    await expect(recoveryIncidents()).resolves.toEqual({ status: "available", incidents: [] });
    await expect(recoveryIncidents()).resolves.toEqual({ status: "unavailable", reason: "query_failed", incidents: null });
  });
});
