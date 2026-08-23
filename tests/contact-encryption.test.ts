import { afterEach, describe, expect, it } from "vitest";
import { ContactEncryptionConfigurationError, decryptContact, encryptContact, requireContactEncryptionKey } from "@/lib/contact-encryption";

const fixtureKey = "local-test-contact-key-material";

describe("contact encryption", () => {
  const original = process.env.CONTACT_ENCRYPTION_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.CONTACT_ENCRYPTION_KEY;
    else process.env.CONTACT_ENCRYPTION_KEY = original;
  });

  it("fails clearly when configuration is missing or too short", () => {
    delete process.env.CONTACT_ENCRYPTION_KEY;
    expect(() => requireContactEncryptionKey()).toThrow(ContactEncryptionConfigurationError);
    process.env.CONTACT_ENCRYPTION_KEY = "short";
    expect(() => requireContactEncryptionKey()).toThrow(ContactEncryptionConfigurationError);
  });

  it("round-trips authenticated AES-GCM without a plaintext fallback", async () => {
    const ciphertext = await encryptContact("fixture@example.invalid", fixtureKey);
    expect(ciphertext).not.toContain("fixture@example.invalid");
    await expect(decryptContact(ciphertext, fixtureKey)).resolves.toBe("fixture@example.invalid");
    await expect(decryptContact(ciphertext, `${fixtureKey}-wrong`)).resolves.toBeNull();
    await expect(decryptContact("fixture@example.invalid", fixtureKey)).resolves.toBeNull();
  });
});
