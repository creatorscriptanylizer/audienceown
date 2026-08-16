import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRecoveryAudienceSummary } from "@/lib/recovery-audience";

const migration = readFileSync("supabase/migrations/20260914000000_recovery_audience_contract.sql", "utf8");

describe("Recovery Pass audience contract", () => {
  it("parses unique participants, destination opt-ins, and timestamp-derived growth separately", () => {
    expect(parseRecoveryAudienceSummary({
      protectedAudience: 1,
      recoveryConnections: 3,
      recoveryDestinations: 3,
      growth: { points: [{ date: "2026-08-14", protectedAudience: 1, recoveryConnections: 3 }] },
    }, "30d")).toMatchObject({
      protectedAudience: 1,
      recoveryConnections: 3,
      growth: { range: "30d", points: [{ protectedAudience: 1, recoveryConnections: 3 }] },
    });
  });

  it("never reads provider-native audience tables or counts", () => {
    expect(migration).toContain("follower_recovery_destination_preferences");
    expect(migration).toContain("c.id=p_creator_id");
    expect(migration).toContain("follower_contact_id");
    expect(migration).toContain("selected_at");
    expect(migration).not.toContain("provider_audience_metrics");
    expect(migration).not.toContain("audience_count");
    expect(migration).not.toContain("followers");
    expect(migration).not.toContain("subscribers");
  });

  it("deduplicates fans and repeated destination interactions while counting distinct opt-ins", () => {
    expect(migration).toContain("count(distinct follower_contact_id)");
    expect(migration).toContain("count(distinct id)");
    expect(migration).toContain("p.status='active'");
    expect(migration).toContain("f.status='active'");
  });

  it("supports only explicit growth ranges and labels its non-provider history source", () => {
    for (const range of ["7d", "30d", "90d", "all"]) expect(migration).toContain(`'${range}'`);
    expect(migration).toContain("recovery_pass_destination_selected_at");
    expect(migration).toContain("invalid recovery audience range");
  });
});
