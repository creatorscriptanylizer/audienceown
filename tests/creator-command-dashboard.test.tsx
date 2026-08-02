import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CreatorCommandDashboard } from "@/components/dashboard/creator-command-dashboard";
import { formatCompactAudience } from "@/lib/dashboard/format-compact-number";
import { calculateProtectionScore } from "@/lib/dashboard/protection-score";
import type { CreatorDashboardData } from "@/lib/dashboard/creator-dashboard";

const data = { calculatedAt: "2026-08-02T12:00:00Z", creator: { displayName: "Creator", handle: "creator" }, protection: calculateProtectionScore({ recoveryCoveragePercent: 50, recoveryPagePublished: true, recoveryPassEnabled: true, verifiedOfficialAccount: true, verifiedBackupAccount: false }), audience: { protectedFans: 1240, fansAtRisk: 2, protectedRatio: 99, trend: [] }, recoveryReadiness: { score: null, state: "Not configured", checklist: [{ key: "page", label: "Recovery page published", status: "complete" as const, href: "/dashboard/creator-page" }, { key: "plan", label: "Emergency plan validated", status: "pending" as const, href: "/dashboard/emergency" }] }, platforms: [{ provider: "youtube", label: "YouTube", audienceCount: null, audienceUnit: "subscribers" as const, verified: true, connected: true, accessLimited: false, health: "healthy" as const, growthPercent: null, trend: null, updatedAt: null, color: "#f00" }, { provider: "instagram", label: "Instagram", audienceCount: null, audienceUnit: "followers" as const, verified: false, connected: false, accessLimited: false, health: "not_configured" as const, growthPercent: null, trend: null, updatedAt: null, color: "#e94b91" }], recentOptIns: [], identity: { trustState: "Not verified", authenticityState: "Not issued", monitoringState: "Healthy", verifiedAccounts: 0, revision: null }, ecosystem: { verifiedDestinations: 0, activeAutomations: 0, openIncidents: 0, lastSyncAt: null, health: "Not configured" }, emergency: { activeEmergencyId: null, activeEmergencyCount: 0, status: "No active emergency", severity: null, activatedAt: null, recoveryPassActive: true, lastDrillAt: null, readinessState: "Not configured" }, liveRecovery: null, nextAction: { label: "Add a verified backup account", description: "Add protection.", href: "/dashboard/platforms", tone: "warning" as const } } satisfies CreatorDashboardData;

describe("creator command dashboard", () => {
  it("formats compact audience values correctly", () => expect([0,999,1000,1240,2180,12400,84120,240000,1000000,1240000].map((value) => formatCompactAudience(value).compact)).toEqual(["0","999","1K","1.24K","2.18K","12.4K","84.1K","240K","1M","1.24M"]));
  it("uses the deterministic versioned protection formula", () => expect(data.protection).toMatchObject({ score: 60, state: "Good foundation", version: "audience-protection-v1" }));
  it("renders required command sections and KPI labels", () => { const html = renderToStaticMarkup(<CreatorCommandDashboard data={data} showRefresh={false}/>); for (const label of ["Audience Protection Score","Protected Fans","Fans At Risk","Recovery Readiness","Platform Breakdown","Recent Opt-ins","Recovery Readiness Checklist","Audience Health","Identity &amp; Authenticity","Ecosystem Health","Emergency Status","Live Recovery Analytics"]) expect(html).toContain(label); });
  it("shows checklist completion without inventing a readiness score", () => { const html = renderToStaticMarkup(<CreatorCommandDashboard data={data} showRefresh={false}/>); expect(html).toContain("1 of 2 checklist items complete"); expect(html).toContain("Checklist completion · 50%"); expect(html).not.toContain("recovery readiness percentage"); });
  it("keeps connected state separate from audience-count availability", () => { const html = renderToStaticMarkup(<CreatorCommandDashboard data={data} showRefresh={false}/>); expect(html).toContain("YouTube"); expect(html).toContain("Verified"); expect(html).toContain("Audience count unavailable"); expect(html).toContain("Instagram"); expect(html).toContain("Connect"); });
  it("uses branded platform colors and exposes exact authoritative counts", () => { const counted = { ...data, platforms: data.platforms.map((platform) => platform.provider === "youtube" ? { ...platform, audienceCount: 1240 } : platform) }; const html = renderToStaticMarkup(<CreatorCommandDashboard data={counted} showRefresh={false}/>); expect(html).toContain("color:#f00"); expect(html).toContain('aria-label="1,240 subscribers"'); expect(html).toContain("1.24K subscribers"); });
  it("renders active zero states without fake names, counts, or trends", () => { const html = renderToStaticMarkup(<CreatorCommandDashboard data={data} showRefresh={false}/>); expect(html).toContain('text-3xl font-semibold">0</p>'); expect(html).toContain("new protected fans today"); expect(html).toContain("Share your Recovery Pass"); expect(html).toContain("Not verified"); expect(html).toContain("Not issued"); expect(html).toContain("Last sync: Not yet synced"); expect(html).toContain("No active recovery incident"); expect(html).not.toMatch(/Jane|Alex|1\.2M followers/); });
  it("preserves all six incident-scoped live analytics positions", () => { const html = renderToStaticMarkup(<CreatorCommandDashboard data={data} showRefresh={false}/>); for (const label of ["Fans targeted", "Alerts sent", "Alerts opened", "Recovery page visits", "Follow clicks", "Migration rate"]) expect(html).toContain(label); expect((html.match(/>—<\/dd>/g) ?? [])).toHaveLength(6); });
  it("renders intentional empty recovery states without a fake trend", () => {
    const empty = { ...data, audience: { protectedFans: 0, fansAtRisk: null, protectedRatio: null, trend: [] } };
    const html = renderToStaticMarkup(<CreatorCommandDashboard data={empty} showRefresh={false}/>);
    expect(html).toContain("Protected Fans: 0 protected fans");
    expect(html).toContain("Fans At Risk: Known fans at risk unavailable");
    expect(html).toContain("Trend starts after your first protected fans");
    expect(html).not.toContain("daily audience snapshots");
  });
  it("keeps responsive, keyboard-focus, and reduced-motion affordances", () => {
    const html = renderToStaticMarkup(<CreatorCommandDashboard data={data} showRefresh={false}/>);
    expect(html).toContain("sm:grid-cols-2 xl:grid-cols-4");
    expect(html).toContain("sm:grid-cols-3 lg:grid-cols-4");
    expect(html).toContain("focus-visible:outline-2");
    expect(html).toContain("motion-reduce:transform-none");
  });
});
