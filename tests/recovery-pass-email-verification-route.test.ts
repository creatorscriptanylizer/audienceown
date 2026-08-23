import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const route = readFileSync(`${root}/app/api/public/recovery-pass/email-verification/route.ts`, "utf8");
const flow = readFileSync(`${root}/components/recovery-pass-flow.tsx`, "utf8");
const activation = readFileSync(`${root}/app/api/public/recovery-pass/activate/route.ts`, "utf8");

describe("Recovery Pass Email verification route", () => {
  it("returns a structured 503 for unavailable configuration", () => {
    expect(route).toContain('kind: "verification_unavailable", reason: configurationFailure');
    expect(route).toContain('"email_otp_pepper_not_configured"');
    expect(route).toContain('"contact_encryption_not_configured"');
    expect(route).toContain('"email_provider_not_configured"');
    expect(route).toContain('"email_sender_not_configured"');
  });

  it("does not blame follower details for configuration or unexpected server failures", () => {
    expect(route).toContain("We Couldn't Verify Your Email Right Now");
    expect(route).toContain("Your information is safe. Please try again.");
    expect(route).toContain("error instanceof z.ZodError");
    expect(route).toContain('kind: "system_error"');
  });

  it("distinguishes consumed and expired challenges", () => {
    expect(route).toContain('code: "consumed"');
    expect(route).toContain('code: "expired", title: "Your Verification Link Expired"');
  });

  it("distinguishes challenge persistence from provider rejection", () => {
    expect(route).toContain('if (inserted.error) return response({ kind: "system_error", title: "We Couldn\'t Verify Your Email Right Now", message: "Your information is safe. Please try again." }, 503)');
    expect(route).toContain('reason: "provider_rejected"');
    expect(route).toContain('cancelled_at: new Date().toISOString()');
  });

  it("returns verification_sent only after a successful provider request", () => {
    expect(route.indexOf('providerRequestSucceeded: true')).toBeLessThan(route.indexOf('kind: "verification_sent"'));
  });

  it("preserves validation and rate-limit responses", () => {
    expect(route).toContain('kind: "rate_limited"');
    expect(route).toContain('}, 429)');
    expect(route).toContain('z.string().email().max(254)');
    expect(route).toContain('kind: "validation_error"');
  });

  it("does not mark Email verified when requesting an OTP", () => {
    const startPath = route.slice(route.indexOf('const email = input.email'), route.indexOf('return response({ kind: "verification_sent"'));
    expect(startPath).not.toContain('verified_at:');
    expect(flow).toContain('setEmailVerified(true)');
    expect(flow.indexOf('result.kind !== "verified"')).toBeLessThan(flow.indexOf('setEmailVerified(true)'));
  });

  it("requires canonical verified Email before first activation", () => {
    expect(activation).toContain('.eq("method_type", "email")');
    expect(activation).toContain('.eq("method_status", "verified")');
    expect(activation).toContain('connection.status !== "active" && !verifiedEmail');
  });
});
