import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EmergencyWorkspace } from "@/components/emergency-workspace";
import { dashboardLinks } from "@/lib/dashboard-navigation";
import { calculateRecoveryReadiness } from "@/lib/recovery-readiness";

const readiness = calculateRecoveryReadiness({page:"complete",pass:"complete",official:"complete",backup:"complete",plan:"complete"});

describe("emergency workspace", () => {
  it("uses the exact primary navigation routes", () => {
    expect(dashboardLinks.map(({ label, href }) => [label, href])).toEqual([
      ["Dashboard", "/dashboard"],
      ["Creator Page", "/dashboard/creator-page"],
      ["Updates", "/dashboard/updates"],
      ["Audience", "/dashboard/audience"],
      ["Platforms", "/dashboard/platforms"],
      ["Identity", "/dashboard/identity"],
      ["Ecosystem", "/dashboard/ecosystem"],
      ["Authenticity", "/dashboard/authenticity"],
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
    const html = renderToStaticMarkup(<EmergencyWorkspace readiness={readiness} primaryDestinationLabel="Official YouTube"/>);
    expect(html).toContain("<h1>Emergency</h1>");
    expect(html).toContain("Recovery setup");
    expect(html).toContain("100% · Recovery ready");
    expect(html).toContain('href="/dashboard/updates/new?type=account_update"');
    expect(html).toContain("Create emergency update");
  });
  it("keeps setup completion, plan validation, and incident lifecycle explicitly separate",()=>{const source=readFileSync("components/emergency/preparedness-center.tsx","utf8");expect(source).toContain("server-validated execution status, separate from Recovery setup completion");const html=renderToStaticMarkup(<EmergencyWorkspace readiness={calculateRecoveryReadiness({page:"complete",pass:"complete",official:"complete",backup:"complete",plan:"incomplete"})}/>);expect(html).toContain("80% · Almost ready");expect(html).toContain("No active emergency");});
});
