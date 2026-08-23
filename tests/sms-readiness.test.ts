import { describe, expect, it } from "vitest";
import { canonicalAppUrl, smsReadiness, smsReadinessDiagnostic } from "@/lib/sms-readiness";

const configured = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://audienceown.example/",
  TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
  TWILIO_AUTH_TOKEN: "safe-secret-token-value-123",
  TWILIO_MESSAGING_SERVICE_SID: `MG${"b".repeat(32)}`,
  TWILIO_VERIFY_SERVICE_SID: `VA${"c".repeat(32)}`,
  CONTACT_ENCRYPTION_KEY: "safe-encryption-key-value",
} as NodeJS.ProcessEnv;

describe("SMS live readiness", () => {
  it("reports safe configured booleans and overall availability", () => {
    expect(smsReadinessDiagnostic(configured, true)).toEqual({
      accountSidConfigured: true,
      authTokenConfigured: true,
      verifyServiceConfigured: true,
      messagingServiceConfigured: true,
      otpReady: true,
      outboundReady: true,
      smsAvailable: true,
      reason: null,
    });
  });

  it.each([
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_VERIFY_SERVICE_SID",
    "TWILIO_MESSAGING_SERVICE_SID",
  ] as const)("disables SMS when %s is missing", (name) => {
    const diagnostic = smsReadinessDiagnostic({ ...configured, [name]: undefined }, true);
    expect(diagnostic.smsAvailable).toBe(false);
    expect(diagnostic.reason).toContain(name);
  });
  it("checks outbound, OTP, and webhook readiness independently", () => {
    expect(smsReadiness(configured, true)).toEqual({
      outbound: "configured",
      otp: "configured",
      webhook: "configured",
    });
    expect(smsReadiness({
      ...configured,
      TWILIO_VERIFY_SERVICE_SID: undefined,
    }, true)).toEqual({
      outbound: "configured",
      otp: "missing_configuration",
      webhook: "configured",
    });
  });

  it.each([
    ["http://audienceown.example", "invalid_configuration"],
    ["https://localhost:3000", "invalid_configuration"],
    ["https://audienceown.example/path", "invalid_configuration"],
    ["https://audienceown.example/?override=true", "invalid_configuration"],
  ])("rejects unsafe production callback origin %s", (url, expected) => {
    expect(smsReadiness({
      ...configured,
      NEXT_PUBLIC_APP_URL: url,
    }, true).outbound).toBe(expected);
  });

  it("rejects placeholder credentials without affecting optional integrations", () => {
    expect(smsReadiness({
      ...configured,
      TWILIO_AUTH_TOKEN: "placeholder-token-value",
    }, true)).toEqual({
      outbound: "invalid_configuration",
      otp: "invalid_configuration",
      webhook: "invalid_configuration",
    });
  });

  it("normalizes the canonical URL to its exact origin", () => {
    expect(canonicalAppUrl(configured, true)).toBe("https://audienceown.example");
  });

  it("allows localhost only outside production", () => {
    expect(canonicalAppUrl({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000/",
      NODE_ENV: "development",
    }, false)).toBe("http://localhost:3000");
  });
});
