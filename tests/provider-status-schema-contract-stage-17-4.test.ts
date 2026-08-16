import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { oauthProviderStatus, providerStatuses } from "@/lib/social-providers/provider-status";

const migrationPath = "supabase/migrations/20260910000000_connected_account_provider_status_contract.sql";
const migration = readFileSync(migrationPath, "utf8");
const constraintValues = [...migration.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);

describe("Stage 17.4 connected account provider-status schema contract", () => {
  it("keeps the database CHECK vocabulary exactly aligned with the application", () => {
    expect(constraintValues).toEqual([...providerStatuses]);
    expect(new Set(constraintValues).size).toBe(providerStatuses.length);
    expect(migration).toContain("add constraint connected_accounts_provider_status_check check");
    expect(migration).not.toMatch(/drop\s+column|alter\s+column\s+provider_status|drop\s+table/i);
  });

  it("keeps invalid statuses outside both contracts", () => {
    expect(providerStatuses).not.toContain("arbitrary" as never);
    expect(constraintValues).not.toContain("arbitrary");
  });

  it("maps successful review-unknown TikTok OAuth to the accepted shared status", () => {
    const status = oauthProviderStatus({
      provider: "tiktok",
      detectionReady: false,
      reviewStatus: "unknown",
    });

    expect(status).toBe("app_review_required");
    expect(constraintValues).toContain(status);
  });

  it("leaves YouTube readiness behavior unchanged", () => {
    expect(oauthProviderStatus({provider:"youtube", detectionReady:true, reviewStatus:"approved"})).toBe("ready");
  });
});
