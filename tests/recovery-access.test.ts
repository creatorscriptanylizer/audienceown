import { describe, expect, it } from "vitest";
import { canAccessRecoveryDeveloperTools } from "@/lib/recovery-access";

describe("Recovery Pass developer access", () => {
  it("does not expose tools to production public visitors", () => {
    expect(canAccessRecoveryDeveloperTools({
      isDevelopment: false,
      isAdmin: false,
      isOwner: false,
    })).toBe(false);
  });

  it("allows development, admins, and page owners", () => {
    expect(canAccessRecoveryDeveloperTools({ isDevelopment: true, isAdmin: false, isOwner: false })).toBe(true);
    expect(canAccessRecoveryDeveloperTools({ isDevelopment: false, isAdmin: true, isOwner: false })).toBe(true);
    expect(canAccessRecoveryDeveloperTools({ isDevelopment: false, isAdmin: false, isOwner: true })).toBe(true);
  });
});
