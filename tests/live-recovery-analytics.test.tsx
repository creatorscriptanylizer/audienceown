import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecoveryKpiCard } from "@/components/recovery/recovery-kpi-card";
import { LiveRecoveryFunnel } from "@/components/recovery/recovery-funnel";
import { LiveRecoveryAnalytics as LiveRecoveryAnalyticsPanel } from "@/components/recovery/live-recovery-analytics";
import { liveMetricEntries, type LiveRecoveryAnalytics } from "@/lib/live-recovery-analytics";

const unavailable = { status: "unavailable" as const, value: null, updatedAt: null, explanation: "Unsupported." };
const snapshot: LiveRecoveryAnalytics = { emergencyId: "incident", title: "Recovery", severity: "high", status: "active", activatedAt: null, resolvedAt: null, calculatedAt: "2026-08-02T00:00:00Z", dataFreshness: "current", metrics: {
  fansTargeted: { status: "available", value: 0, updatedAt: null }, alertsSent: { status: "available", value: 12, updatedAt: null }, alertsOpened: unavailable, recoveryPageVisits: unavailable, followClicks: unavailable,
  migrationRate: { ...unavailable, numerator: null, denominator: 0, unit: "percent", measurement: "unavailable" },
}, transportBreakdown: [], destinationBreakdown: [] };

describe("live recovery analytics", () => {
  it("uses the exact six canonical labels", () => expect(liveMetricEntries(snapshot).map(([label]) => label)).toEqual(["Fans targeted", "Alerts sent", "Alerts opened", "Recovery page visits", "Follow clicks", "Migration rate"]));
  it("distinguishes available zero from unavailable", () => {
    expect(renderToStaticMarkup(<RecoveryKpiCard label="Fans targeted" metric={snapshot.metrics.fansTargeted}/>)).toContain(">0<");
    expect(renderToStaticMarkup(<RecoveryKpiCard label="Alerts opened" metric={snapshot.metrics.alertsOpened}/>)).toContain("Unavailable");
  });
  it("keeps the funnel consistent with the KPI source and accessible", () => {
    const html = renderToStaticMarkup(<LiveRecoveryFunnel data={snapshot}/>); expect(html).toContain("<ol"); expect(html).toContain("Alerts sent"); expect(html).toContain(">12<"); expect(html).toContain("Unavailable");
  });
  it("formats migration percentages locale-safely", () => {
    const metric = { ...snapshot.metrics.migrationRate, status: "available" as const, value: 12.5, numerator: 1, denominator: 8, measurement: "click_through_proxy" as const };
    expect(renderToStaticMarkup(<RecoveryKpiCard label="Migration rate" metric={metric}/>)).toMatch(/12[.,]5%/);
  });
  it("keeps successful-empty incidents distinct from unavailable incident activity", () => {
    const empty = renderToStaticMarkup(<LiveRecoveryAnalyticsPanel incidents={[]} incidentsAvailable initial={null} selectedId={null}/>);
    const failed = renderToStaticMarkup(<LiveRecoveryAnalyticsPanel incidents={[]} incidentsAvailable={false} initial={null} selectedId={null}/>);
    expect(empty).toContain("Live recovery metrics will appear after Emergency Mode is activated.");
    expect(empty).not.toContain("Recovery incident activity unavailable");
    expect(failed).toContain("Recovery incident activity unavailable");
    expect(failed).not.toContain("Live recovery metrics will appear after Emergency Mode is activated.");
  });
});
