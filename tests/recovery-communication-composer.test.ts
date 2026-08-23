import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alertComposerDefinitions, getIntentDefinition } from "@/lib/broadcast-studio";
import { linkedRecoveryIds, recoveryGuidance, recoverySituations } from "@/lib/recovery-communication";

const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");
const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
const css = readFileSync("app/globals.css", "utf8");

describe("Recovery communication composer", () => {
  it("provides all six keyboard-selectable account situations", () => {
    expect(recoverySituations.map((item) => item.label)).toEqual(["Account hacked","Account suspended","Account blocked","Cannot access the account","Being impersonated","Other"]);
    expect(studio).toContain('role="radiogroup" aria-label="Recovery situation"');
    expect(studio).toContain('role="radio" aria-checked={recoverySituation === item.key}');
  });

  it("generates distinct grounded guidance without calling a model for facts", () => {
    const hacked = recoveryGuidance("hacked");
    const suspended = recoveryGuidance("suspended");
    const impersonated = recoveryGuidance("impersonated");
    expect(hacked.summary).toContain("suspicious messages or links");
    expect(suspended.summary).not.toMatch(/hack|compromis/i);
    expect(impersonated.summary).toMatch(/lookalike|verified identity/i);
    expect(new Set([hacked.summary,suspended.summary,impersonated.summary])).toHaveLength(3);
  });

  it("filters Recovery destinations by the canonical Main relationship", () => {
    const relationships = [
      {main_connected_account_id:"kwamoon",recovery_connected_account_id:"npa"},
      {main_connected_account_id:"kwamoon",recovery_connected_account_id:"lineconomy"},
      {main_connected_account_id:"watchboost",recovery_connected_account_id:"discord"},
      {main_connected_account_id:"kwamoon",recovery_connected_account_id:"shared"},
      {main_connected_account_id:"watchboost",recovery_connected_account_id:"shared"},
    ];
    expect([...linkedRecoveryIds("kwamoon",relationships)]).toEqual(["npa","lineconomy","shared"]);
    expect(linkedRecoveryIds("kwamoon",relationships).has("discord")).toBe(false);
    expect(linkedRecoveryIds("watchboost",relationships).has("shared")).toBe(true);
  });

  it("validates ownership, role/health, and exact Main-to-Recovery linkage server-side", () => {
    expect(actions).toContain("resolveRecoveryCommunicationDestinations(creatorId,values.affected_platform_connection_id,values.selected_recovery_account_ids)");
    expect(actions).toContain("Every Recovery destination must belong to the selected Main account's Recovery Network.");
    expect(actions).toContain('admin.rpc("update_recovery_communication_draft"');
  });

  it("uses Recovery-specific steps, review, dynamic preview, and scheduling", () => {
    for (const value of ["What happened?","Your emergency audience","Write the recovery alert","Where should followers find you?","Where are followers moving to?","Write the migration update"]) expect(studio).toContain(value);
    expect(alertComposerDefinitions.account_inaccessible).toMatchObject({contextHeading:"Which Main account is affected?",reviewTitle:"Review emergency alert"});
    expect(alertComposerDefinitions.platform_migration.reviewTitle).toBe("Review migration alert");
    expect(studio).toContain("<AlertMessagePreview");
    expect(studio).toContain('aria-label="Delivery time"');
    expect(alertComposerDefinitions.platform_migration).toMatchObject({ctaPlaceholder:"Find me here",sendLabel:"Send migration alert",scheduleLabel:"Schedule migration alert"});
  });

  it("keeps both flows on mandatory Recovery Pass eligibility", () => {
    for (const intent of ["account_inaccessible","platform_migration"] as const) {
      expect(getIntentDefinition(intent)).toMatchObject({mandatory:true,category:"recovery",platform:"required"});
      expect(alertComposerDefinitions[intent].audienceLabel).toBe("Mandatory Recovery Pass");
    }
    expect(studio).toContain("native followers are not delivery recipients");
  });

  it("retains provider icons, focus states, reduced motion, and responsive stacking", () => {
    expect(studio).toContain("<PlatformBrandIcon");
    expect(css).toContain(".recovery-situation-grid>button.is-selected");
    expect(css).toContain("@media(max-width:760px){.recovery-situation-grid{grid-template-columns:1fr}");
    expect(css).toContain("prefers-reduced-motion");
  });
});
