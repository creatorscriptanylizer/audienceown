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
      ["Verified Identity", "/dashboard/authenticity"],
    ]);
  });

  it("hides advanced destinations from primary navigation without deleting their routes",()=>{for(const [label,href,file] of [["Identity","/dashboard/identity","app/dashboard/identity/page.tsx"],["Ecosystem","/dashboard/ecosystem","app/dashboard/ecosystem/page.tsx"],["Recovery Analytics","/dashboard/analytics/recovery","app/dashboard/analytics/recovery/page.tsx"],["Emergency","/dashboard/emergency","app/dashboard/emergency/page.tsx"]]){expect(dashboardLinks.some(item=>item.label===label||item.href===href)).toBe(false);expect(()=>readFileSync(file,"utf8")).not.toThrow();}});

  it("keeps Settings separate from Security", () => {
    expect(dashboardLinks.find(({ label }) => String(label) === "Settings")).toBeUndefined();
    expect(dashboardLinks.some(({ href }) => String(href) === "/dashboard/security")).toBe(false);
  });

  it("renders the emergency recovery workspace and safe update CTA", () => {
    const html = renderToStaticMarkup(<EmergencyWorkspace readiness={readiness} primaryDestinationLabel="Official YouTube"/>);
    expect(html).toContain("<h1>Emergency</h1>");
    expect(html).toContain("Recovery setup");
    expect(html).toContain("100% · Recovery ready");
    expect(html).toContain('href="/dashboard/updates/new?intent=emergency"');
    expect(html).not.toContain("?type=account_update");
    expect(html).toContain("Create emergency update");
  });
  it("keeps setup completion, plan validation, and incident lifecycle explicitly separate",()=>{const source=readFileSync("components/emergency/preparedness-center.tsx","utf8");expect(source).toContain("server-validated execution status, separate from Recovery setup completion");const html=renderToStaticMarkup(<EmergencyWorkspace readiness={calculateRecoveryReadiness({page:"complete",pass:"complete",official:"complete",backup:"complete",plan:"incomplete"})}/>);expect(html).toContain("80% · Almost ready");expect(html).toContain("No active emergency");});
});
