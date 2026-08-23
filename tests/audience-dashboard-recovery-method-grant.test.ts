import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Audience recovery-method authorization contract", () => {
  it("grants authenticated creators every lifecycle column selected by the Audience loader", () => {
    const loader = readFileSync("lib/audience-dashboard.ts", "utf8");
    const migration = readFileSync("supabase/migrations/20260930000000_audience_recovery_method_read_columns.sql", "utf8");

    expect(loader).toContain("destination_masked,consent_revoked_at,opted_out_at");
    expect(migration).toMatch(/grant select \(consent_revoked_at, opted_out_at\)/);
    expect(migration).toContain("on public.follower_recovery_methods");
    expect(migration).toContain("to authenticated");
    expect(migration).not.toMatch(/follower_contacts|service_role|disable row level security/i);
  });
});
