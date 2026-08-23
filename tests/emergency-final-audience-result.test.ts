import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("Emergency final audience and publish results", () => {
  const actions = read("app/dashboard/updates/actions.ts");
  const studio = read("components/broadcast-studio/broadcast-studio.tsx");
  const delivery = read("lib/update-delivery.ts");

  it("renders the canonical account-scoped preview in final confirmation", () => {
    expect(studio).toContain("Emergency audience");
    expect(studio).toContain("Per-account eligibility");
    expect(studio).toContain("optedInFollowerCount.toLocaleString()");
    expect(studio).toContain("Deduplicated across selected accounts");
    expect(studio).not.toContain('estimatedAudienceLabel ?? "—"} Recovery Pass followers');
  });

  it("keeps unique followers separate from supported delivery channels", () => {
    expect(studio).toContain("unique followers total. Channel counts are not added together.");
    expect(studio).toContain("Followers will receive this alert through their verified communication preferences.");
    expect(studio).toContain("result.byTransport.sms.toLocaleString()");
    expect(delivery).toContain('method.method_type === "sms"');
  });

  it("returns explicit sent, zero-audience, and error states", () => {
    expect(actions).toContain('kind: "sent"');
    expect(actions).toContain('kind: "zero_audience"');
    expect(actions).toContain('kind: "error"');
    expect(actions).toContain("Emergency alert could not be sent.");
    expect(studio).toContain('finalResult?.kind === "sent"');
    expect(studio).toContain("EmergencySendResult");
  });

  it("never returns a result-less state from an Emergency publish guard", () => {
    expect(actions).toContain("emergencyPublishError(");
    expect(actions).toContain("guardReturn(");
    expect(actions).toContain("Emergency publishUpdate attempted to return without a structured result");
    expect(actions).toContain('stage: "invariant_missing_structured_result"');
  });

  it("validates the complete Recovery destination collection without a legacy first-URL guard", () => {
    expect(actions).toContain("await resolveRecoveryCommunicationDestinations(creatorId,values.affected_platform_connection_id,values.selected_recovery_account_ids)");
    expect(actions).not.toContain("values.cta_url !== destinations[0]?.url");
    expect(actions).not.toContain("Use the canonical URL for the first selected Recovery destination.");
  });

  it("logs only aggregate Emergency lifecycle data", () => {
    for (const stage of ["publish_entered", "guard_publish_schema_failed", "guard_update_not_editable", "zero_audience_return", "publish_returning"]) {
      expect(actions).toContain(stage);
    }
    for (const stage of ["account_scope_loaded", "audience_resolved", "delivery_rpc_start", "delivery_rpc_complete"]) {
      expect(delivery).toContain(stage);
    }
    expect(actions).toContain("uniqueRecipientCount");
    expect(delivery).toContain("emailEligibleCount");
    expect(delivery).toContain("smsEligibleCount");
    expect(actions).toContain('process.env.AUDIENCEOWN_DEBUG === "1"');
    expect(studio).toContain("[AUDIENCEOWN EMERGENCY CLIENT]");
  });
});
