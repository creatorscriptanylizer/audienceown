import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSocialSecret, encryptSocialSecret, socialTokenEncryptionState } from "@/lib/social-secrets";

afterEach(() => vi.unstubAllEnvs());

describe("social token encryption configuration", () => {
  it.each([
    [undefined, "missing"],
    ["", "missing"],
    ["   ", "invalid_format"],
    ["any non-empty UTF-8 secret", "configured"],
  ] as const)("classifies %p as %s", (value, expected) => {
    expect(socialTokenEncryptionState(value)).toBe(expected);
  });

  it("retains the existing SHA-256-derived AES key behavior", () => {
    vi.stubEnv("SOCIAL_TOKEN_ENCRYPTION_KEY", "local secret with no prescribed encoding");
    const ciphertext = encryptSocialSecret("provider-token");
    expect(ciphertext).not.toContain("provider-token");
    expect(decryptSocialSecret(ciphertext)).toBe("provider-token");
  });

  it("rejects whitespace-only configuration", () => {
    vi.stubEnv("SOCIAL_TOKEN_ENCRYPTION_KEY", "   ");
    expect(() => encryptSocialSecret("provider-token")).toThrow("invalid format");
  });
});
