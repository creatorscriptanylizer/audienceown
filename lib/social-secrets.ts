import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type SocialTokenEncryptionState = "configured" | "missing" | "invalid_format";

export function socialTokenEncryptionState(value = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY): SocialTokenEncryptionState {
  if (value === undefined || value.length === 0) return "missing";
  if (value.trim().length === 0) return "invalid_format";
  return "configured";
}

function key() {
  const value = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  const state = socialTokenEncryptionState(value);
  if (state === "missing") throw new Error("Social token encryption is not configured.");
  if (state === "invalid_format") throw new Error("Social token encryption has an invalid format.");
  if (value === undefined) throw new Error("Social token encryption is not configured.");
  return createHash("sha256").update(value).digest();
}

export function encryptSocialSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decryptSocialSecret(value: string) {
  const payload = Buffer.from(value, "base64");
  if (payload.length < 29) throw new Error("Invalid encrypted social secret.");
  const decipher = createDecipheriv("aes-256-gcm", key(), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
}
