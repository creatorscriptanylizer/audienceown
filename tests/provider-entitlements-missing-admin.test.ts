import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Supabase admin credentials are not configured.");
  },
}));

import { getCreatorEntitlements } from "@/lib/provider-entitlements";

describe("provider entitlements without admin configuration", () => {
  it("surfaces the safe configuration error instead of entitlements_unavailable", async () => {
    await expect(getCreatorEntitlements("creator-id")).rejects.toThrow(
      "Supabase admin credentials are not configured.",
    );
  });
});
