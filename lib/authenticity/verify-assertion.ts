import { createPublicKey } from "node:crypto";
import type { JsonWebKey as NodeJsonWebKey } from "node:crypto";
import { verifyLocalSignature } from "./signing";
import type { SignedAuthenticityAssertion } from "./types";

export type AssertionVerification = {
  valid: boolean;
  reason?: "malformed" | "version" | "issuer" | "expired" | "not_yet_valid" | "key" | "signature";
  assertion?: SignedAuthenticityAssertion;
};

export function verifyAuthenticityAssertion(
  value: unknown,
  keys: { kid: string; kty?: string; crv?: string; x?: string; alg?: string }[],
  options: { issuer: string; now?: Date },
): AssertionVerification {
  if (!value || typeof value !== "object") return { valid: false, reason: "malformed" };
  const assertion = value as SignedAuthenticityAssertion;
  if (!assertion.payload || !assertion.protected || typeof assertion.signature !== "string"
    || assertion.protected.alg !== "EdDSA" || typeof assertion.protected.kid !== "string") {
    return { valid: false, reason: "malformed" };
  }
  if (assertion.payload.version !== "audienceown-authenticity-v1") return { valid: false, reason: "version" };
  if (assertion.payload.iss !== options.issuer) return { valid: false, reason: "issuer" };
  const now = (options.now ?? new Date()).getTime();
  const issued = Date.parse(assertion.payload.issuedAt);
  const expires = Date.parse(assertion.payload.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires)) return { valid: false, reason: "malformed" };
  if (issued > now + 60_000) return { valid: false, reason: "not_yet_valid" };
  if (expires <= now) return { valid: false, reason: "expired" };
  const jwk = keys.find((key) => key.kid === assertion.protected.kid && key.alg === "EdDSA");
  if (!jwk) return { valid: false, reason: "key" };
  try {
    const key = createPublicKey({ key: jwk as NodeJsonWebKey, format: "jwk" });
    return verifyLocalSignature(assertion, key)
      ? { valid: true, assertion }
      : { valid: false, reason: "signature" };
  } catch {
    return { valid: false, reason: "key" };
  }
}
