import { describe, expect, it } from "vitest";
import {
  buildRecoveryOpportunities,
  mapTrendForChart,
  recoveryAnalyticsThresholds,
  suppressBreakdown,
  suppressCount,
  type RecoveryCoverage,
} from "@/lib/recovery-analytics";

const coverage: RecoveryCoverage = {
  total_relationships: 100,
  recovery_ready_relationships: 40,
  uncovered_relationships: 50,
  partially_configured_relationships: 10,
  recovery_coverage_rate: 40,
  change_vs_previous_snapshot: null,
  last_snapshot_at: null,
};

describe("recovery analytics", () => {
  it("applies privacy suppression at the exact boundary", () => {
    expect(suppressCount(4, 5)).toMatchObject({ suppressed: true, count: null });
    expect(suppressCount(5, 5)).toEqual({ suppressed: false, count: 5, display: "5" });
    expect(suppressCount(0, 5)).toEqual({ suppressed: false, count: 0, display: "0" });
  });

  it("suppresses a whole breakdown to reduce subtraction risk", () => {
    const result = suppressBreakdown({ email: 20, sms: 2, whatsapp: 8 }, 5);
    expect(result.email.count).toBeNull();
    expect(result.sms.count).toBeNull();
    expect(result.whatsapp.count).toBeNull();
  });

  it("uses safe configuration defaults", () => {
    expect(recoveryAnalyticsThresholds({} as NodeJS.ProcessEnv)).toEqual({
      lowCoveragePercent: 50,
      coverageDeclinePercent: 10,
      highFailurePercent: 20,
      minimumSampleSize: 10,
      privacyThreshold: 5,
    });
  });

  it("creates deterministic low-coverage insights at the boundary", () => {
    expect(buildRecoveryOpportunities(coverage, null)[0]).toMatchObject({
      type: "low_overall_coverage", metric: 40, threshold: 50,
    });
    expect(buildRecoveryOpportunities({
      ...coverage, recovery_coverage_rate: 50,
    }, null)[0].type).not.toBe("low_overall_coverage");
  });

  it("returns insufficient-data guidance for small samples", () => {
    expect(buildRecoveryOpportunities({
      ...coverage, total_relationships: 9,
    }, 100)[0].type).toBe("insufficient_data");
  });

  it("maps empty and one-point chart data safely", () => {
    expect(mapTrendForChart([])).toEqual([]);
    expect(mapTrendForChart([{
      snapshot_date: "2026-08-07",
      total_relationships: 10,
      recovery_ready_relationships: 5,
      recovery_coverage_rate: 50,
    }])).toEqual([{ date: "2026-08-07", total: 10, ready: 5, rate: 50 }]);
  });
});
