import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmergencyWorkspace } from "@/components/emergency-workspace";
import { dashboardLinks } from "@/lib/dashboard-navigation";

const readiness = {
  recoveryPassEnabled: true,
  creatorPageLive: true,
  profileCompleted: true,
  connectedPlatformCount: 2,
  backupPlatformCount: 1,
  primaryDestinationLabel: "Official YouTube",
};

describe("emergency workspace", () => {
  it("uses the exact primary navigation routes", () => {
    expect(dashboardLinks.map(({ label, href }) => [label, href])).toEqual([
      ["Dashboard", "/dashboard"],
      ["Creator Page", "/dashboard/creator-page"],
      ["Updates", "/dashboard/updates"],
      ["Audience", "/dashboard/audience"],
      ["Platforms", "/dashboard/platforms"],
      ["Recovery Analytics", "/dashboard/analytics/recovery"],
      ["Emergency", "/dashboard/emergency"],
      ["Settings", "/dashboard/settings"],
    ]);
  });

  it("keeps Settings separate from Security", () => {
    expect(dashboardLinks.find(({ label }) => label === "Settings")?.href).toBe("/dashboard/settings");
    expect(dashboardLinks.some(({ href }) => String(href) === "/dashboard/security")).toBe(false);
  });

  it("renders the emergency recovery workspace and safe update CTA", () => {
    const html = renderToStaticMarkup(<EmergencyWorkspace readiness={readiness}/>);
    expect(html).toContain("<h1>Emergency</h1>");
    expect(html).toContain("Recovery readiness");
    expect(html).toContain('href="/dashboard/updates/new?type=account_update"');
    expect(html).toContain("Create emergency update");
  });
});
