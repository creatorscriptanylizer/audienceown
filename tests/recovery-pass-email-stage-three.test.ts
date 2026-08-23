import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const flow = readFileSync("components/recovery-pass-flow.tsx", "utf8");
const styles = readFileSync("components/recovery-pass-flow.css", "utf8");

describe("Recovery Pass Stage 2 to Stage 3 Email verification", () => {
  it("starts the canonical challenge before advancing from Stage 2", () => {
    expect(flow).toContain('if (await verifyEmail("start")) setStage(3)');
    expect(flow).toContain('stage === 2 ? continueFromEmail : advance');
    expect(flow).toContain("Sending verification code…");
    expect(flow).toContain("if (requestPending.current) return false");
  });

  it("renders Stage 3 as an already-sent six-digit challenge", () => {
    expect(flow).toContain("We sent a 6-digit verification code to");
    expect(flow).toContain('maxLength={6}');
    expect(flow).toContain('inputMode="numeric"');
    expect(flow).toContain('autoComplete="one-time-code"');
    expect(flow).toContain('disabled={busy || !/^\\d{6}$/.test(code)}');
    expect(flow).toContain("Array.from({ length: 6 }");
    expect(flow).toContain("rp-otp-cells");
    expect(flow).not.toContain('onVerify={() => verifyEmail(emailChallenge ? "verify" : "start")}');
  });

  it("only enables Continue from canonical verified state", () => {
    expect(flow).toContain('if (result.kind !== "verified")');
    expect(flow.indexOf('if (result.kind !== "verified")')).toBeLessThan(flow.indexOf("setEmailVerified(true)"));
    expect(flow).toContain("stage === 3 ? emailVerified");
    expect(flow).toContain("Email verified");
  });

  it("preserves resend, restoration, accessible status, and mobile-safe styling", () => {
    expect(flow).toContain("A new code was sent.");
    expect(flow).toContain("sessionStorage.setItem");
    expect(flow).toContain('role="status" aria-live="polite"');
    expect(flow).toContain('String(resendSeconds).padStart(2, "0")');
    expect(flow).toContain("rp-resend-card");
    expect(flow).toContain("Resend Verification Email");
    expect(flow).toContain("Send a New Verification Email");
    expect(styles).toContain("@media(max-width:430px)");
    expect(styles).toContain("grid-template-columns:repeat(6,minmax(0,1fr))");
    expect(styles).toContain("min-width:0");
    expect(styles).toContain("prefers-reduced-motion:reduce");
  });
});
