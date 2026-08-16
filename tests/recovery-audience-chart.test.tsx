// @vitest-environment jsdom

import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecoveryAudienceChart, RecoveryChartLoadingState } from "@/components/dashboard/recovery-audience-chart";
import { RecoveryAudienceChartImpl } from "@/components/dashboard/recovery-audience-chart-impl";
import { emptyRecoveryAudienceSummary, type RecoveryAudienceRange, type RecoveryAudienceSummary } from "@/lib/recovery-audience";

const summary = (range: RecoveryAudienceRange, points: RecoveryAudienceSummary["growth"]["points"] = []): RecoveryAudienceSummary => ({
  protectedAudience: points.at(-1)?.protectedAudience ?? 0,
  recoveryConnections: points.at(-1)?.recoveryConnections ?? 0,
  recoveryDestinations: points.length ? 1 : 0,
  growth: { range, historySource: "recovery_pass_destination_selected_at", points },
});
const ranges = (points: RecoveryAudienceSummary["growth"]["points"] = []) => ({
  "7d": points.length ? summary("7d", points) : emptyRecoveryAudienceSummary("7d"),
  "30d": points.length ? summary("30d", points) : emptyRecoveryAudienceSummary("30d"),
  "90d": points.length ? summary("90d", points) : emptyRecoveryAudienceSummary("90d"),
  all: points.length ? summary("all", points) : emptyRecoveryAudienceSummary("all"),
});

afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

async function expectCleanHydration(markup: string, props: React.ComponentProps<typeof RecoveryAudienceChartImpl>) {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.append(container);
  const recoverable: unknown[] = [];
  await act(async () => { hydrateRoot(container, <RecoveryAudienceChartImpl {...props}/>, { onRecoverableError: (error) => recoverable.push(error) }); });
  expect(recoverable).toEqual([]);
  return container;
}

describe("RecoveryAudienceChart client-only boundary", () => {
  it("server-renders a stable premium placeholder instead of chart content", () => {
    const props = { summaries: ranges(), recoveryPassUrl: "https://audienceown.test/creator" };
    const server = renderToString(<RecoveryAudienceChart {...props}/>);
    expect(server).toContain("premium-dashboard-panel recovery-growth-panel");
    expect(server).toContain("Recovery Pass");
    expect(server).toContain("Audience Growth");
    expect(server).toContain("Unique protected participants attributed from destination selections.");
    expect(server).toContain("recovery-chart-wrap");
    expect(server).not.toContain("recovery-chart-empty-icon");
    expect(renderToString(<RecoveryChartLoadingState/>)).toBe(server);
  });

  it("keeps the client implementation deterministic for populated chart data", async () => {
    const props = { summaries: ranges([
      { date: "2026-08-01", protectedAudience: 2, recoveryConnections: 3 },
      { date: "2026-08-02", protectedAudience: 5, recoveryConnections: 7 },
    ]) };
    const first = renderToString(<RecoveryAudienceChartImpl {...props}/>);
    const second = renderToString(<RecoveryAudienceChartImpl {...props}/>);
    expect(first).toBe(second);
    expect(first).toContain('aria-pressed="true">30 Days');
    expect(first).toContain("8/1/2026: 2 protected participants");
    expect(first).not.toContain("recovery-chart-empty");
    await expectCleanHydration(first, props);
  });

  it("renders the complete zero-data state in the client implementation", async () => {
    const props = { summaries: ranges(), recoveryPassUrl: "https://audienceown.test/creator" };
    const server = renderToString(<RecoveryAudienceChartImpl {...props}/>);
    expect(server).toContain("recovery-chart-empty-icon");
    expect(server).toContain("No protected audience yet");
    expect(server).toContain("Share Recovery Pass");
    const hydrated = await expectCleanHydration(server, props);
    expect(hydrated.innerHTML).toContain("recovery-chart-empty-icon");
  });

  it("keeps 30 days as the fixed initial range", () => {
    const container = document.createElement("div");
    document.body.append(container);
    act(() => createRoot(container).render(<RecoveryAudienceChartImpl summaries={ranges()}/>));
    const selected = container.querySelector('button[aria-pressed="true"]');
    expect(selected?.textContent).toBe("30 Days");
  });
});
