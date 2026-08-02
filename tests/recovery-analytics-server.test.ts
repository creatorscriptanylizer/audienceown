import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { recoveryAnalyticsOverview } from "@/lib/recovery-analytics-server";

describe("recoveryAnalyticsOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
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
});
