import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalize } from "@/lib/authenticity/canonical";
import { canonicalVerificationPath, isVerifiedAuthenticity, parseAuthenticityRecord } from "@/lib/authenticity/public";
import { publicJwk, signAssertion } from "@/lib/authenticity/signing";
import { verifyAuthenticityAssertion } from "@/lib/authenticity/verify-assertion";
import type { AuthenticityAssertionPayload } from "@/lib/authenticity/types";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const issuedAt = "2026-08-17T00:00:00.000Z";
const expiresAt = "2026-08-17T01:00:00.000Z";
const payload: AuthenticityAssertionPayload = { iss: "https://audienceown.test", sub: "creator", aud: "public", version: "audienceown-authenticity-v1", issuedAt, expiresAt, identityRevision: 2, presentationRevision: 1, trustState: "verified", accounts: [], domains: [], relationships: [], emergency: null };

describe("public authenticity", () => {
  it("canonicalizes object keys recursively", () => expect(canonicalize({ z: 1, a: { y: 2, b: 3 } })).toBe('{"a":{"b":3,"y":2},"z":1}'));
  it("recognizes only public verified states", () => {
    expect(isVerifiedAuthenticity("strongly_verified_identity")).toBe(true);
    expect(isVerifiedAuthenticity("verification_restricted")).toBe(false);
  });
  it("creates a path containing only the encoded slug", () => expect(canonicalVerificationPath("a/b?x=1")).toBe("/verify/a%2Fb%3Fx%3D1"));
  it("rejects malformed public records", () => expect(parseAuthenticityRecord({ trustScore: 99 })).toBeNull());
});

describe("authenticity assertions", () => {
  const signed = signAssertion(payload, { privateKey, publicKey, keyId: "key-1" })!;
  const keys = [publicJwk(publicKey, "key-1")];
  const options = { issuer: payload.iss, now: new Date("2026-08-17T00:30:00.000Z") };
  it("signs and verifies Ed25519 assertions", () => expect(verifyAuthenticityAssertion(signed, keys, options).valid).toBe(true));
  it("rejects expired assertions", () => expect(verifyAuthenticityAssertion(signed, keys, { ...options, now: new Date(expiresAt) }).reason).toBe("expired"));
  it("rejects a wrong issuer", () => expect(verifyAuthenticityAssertion(signed, keys, { ...options, issuer: "https://other.test" }).reason).toBe("issuer"));
  it("rejects a wrong key", () => {
    const other = generateKeyPairSync("ed25519");
    expect(verifyAuthenticityAssertion(signed, [publicJwk(other.publicKey, "key-1")], options).reason).toBe("signature");
  });
  it("supports overlapping key rotation", () => {
    const old = generateKeyPairSync("ed25519");
    expect(verifyAuthenticityAssertion(signed, [publicJwk(old.publicKey, "old"), ...keys], options).valid).toBe(true);
  });
  it("detects payload tampering", () => expect(verifyAuthenticityAssertion({ ...signed, payload: { ...signed.payload, sub: "attacker" } }, keys, options).reason).toBe("signature"));
});
