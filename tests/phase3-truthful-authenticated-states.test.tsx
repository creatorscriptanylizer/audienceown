import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AutomationSummary } from "@/components/ecosystem/automation-summary";
import { EmergencyWorkspace } from "@/components/emergency-workspace";
import { calculateRecoveryReadiness } from "@/lib/recovery-readiness";

const source = (path:string) => readFileSync(path, "utf8");
const readiness = calculateRecoveryReadiness({page:"complete",pass:"complete",official:"incomplete",backup:"incomplete",plan:"incomplete"});
const unavailableReadiness = calculateRecoveryReadiness({page:"complete",pass:"complete",official:"unavailable",backup:"unavailable",plan:"unavailable"});

describe("Phase 3 truthful authenticated data states", () => {
  it("keeps ecosystem successful zeros distinct from unavailable automation counts", () => {
    const zero = renderToStaticMarkup(<AutomationSummary destinations={[]} incidents={[]}/>);
    expect(zero).toContain(">0<");
    expect(zero).not.toContain("Temporarily unavailable");
    const unavailable = renderToStaticMarkup(<AutomationSummary destinations={[]} incidents={[]} destinationsAvailable={false} incidentsAvailable={false}/>);
    expect(unavailable).toContain("Temporarily unavailable");
    expect(unavailable).toContain(">—<");
    expect(unavailable).not.toContain(">0<");
  });

  it("distinguishes no emergency from failed emergency, readiness, and delivery sources", () => {
    const empty = renderToStaticMarkup(<EmergencyWorkspace readiness={readiness}/>);
    expect(empty).toContain("No active emergency");
    const failed = renderToStaticMarkup(<EmergencyWorkspace readiness={unavailableReadiness} availability={{accounts:false,emergencies:false,deliveries:false,preparedness:false}}/>);
    for (const copy of ["Emergency status unavailable", "Preparedness unavailable", "Readiness unavailable", "Status unavailable"]) expect(failed).toContain(copy);
    expect(failed).not.toContain("No active emergency");
  });

  it("guards every identity domain independently from synthetic zero, healthy, and unverified states", () => {
    const page = source("app/dashboard/identity/page.tsx");
    for (const copy of ["Monitoring unavailable", "Trust status unavailable", "Identity overview unavailable", "Accounts unavailable", "Relationship history unavailable", "Trust history unavailable"]) expect(page).toContain(copy);
    expect(page).toContain("monitoringAvailable ?");
    expect(page).toContain("trustAvailable ?");
    expect(page).toContain("overviewAvailable ?");
  });

  it("keeps ecosystem destinations, health, automation, incidents, and activity independently truthful", () => {
    const page = source("app/dashboard/ecosystem/page.tsx");
    for (const copy of ["Destinations unavailable", "Provider health unavailable", "Review status unavailable", "Sync activity unavailable"]) expect(page).toContain(copy);
    expect(page).toContain("destinationsAvailable={!destinationsResult.error}");
    expect(page).toContain("incidentsAvailable={!incidentsResult.error}");
  });

  it("makes platform account failure explicit and metric failure independent from connection state", () => {
    const page = source("app/dashboard/platforms/page.tsx");
    const manager = source("components/platforms-manager.tsx");
    expect(page).toContain("Platforms unavailable");
    expect(page).toContain("audience_unavailable:Boolean(audienceMetricsResult.error)");
    expect(manager).toContain("Native audience unavailable");
    expect(manager).toContain("resolveConnectionStatus");
  });

  it("preserves audience membership while marking failed secondary methods and preferences unavailable", () => {
    const page = source("app/dashboard/audience/page.tsx");
    expect(page).toContain("methodsAvailable");
    expect(page).toContain("preferencesAvailable");
    expect(page).toContain('!methodsAvailable?"Unavailable"');
    expect(page).toContain('!preferencesAvailable?"Unavailable"');
    expect(page).toContain("Protected fans");
  });

  it("uses defaults only after a successful missing AI row and never invents Free billing", () => {
    const page = source("app/dashboard/settings/page.tsx");
    expect(page).toContain("settingsResult.error?<UnavailableState");
    expect(page).toContain("settings={stored??defaults}");
    expect(page).toContain("billingResult.error||!entitlements");
    expect(page).toContain("Billing unavailable");
    expect(page).toContain("usageAvailable={!usageResult.error}");
  });

  it("logs only sanitized page/query failure categories through the shared contract", () => {
    const availability = source("lib/data-availability.ts");
    expect(availability).toContain('reason: "query_failed"');
    expect(availability).toContain("debugDatabaseError");
    expect(availability).not.toMatch(/token|secret|email|phone/i);
  });
});
