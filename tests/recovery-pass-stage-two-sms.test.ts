import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const flow = readFileSync(`${root}/components/recovery-pass-flow.tsx`, "utf8");
const enrollment = readFileSync(`${root}/lib/recovery-pass-enrollment.ts`, "utf8");
const smsPendingMigration = readFileSync(`${root}/supabase/migrations/20260928000003_recovery_pass_sms_pending_activation.sql`, "utf8");

describe("Recovery Pass email-only direct delivery", () => {
  it("renders the approved dynamic direct-connection message and required Email card", () => {
    expect(flow).toContain("Choose how {name} can reach you beyond social platforms.");
    expect(flow).toContain("This is how {name} can reach you if something happens to an account, tell you what happened, and help you find where to connect with them next.");
    expect(flow).toContain('className="rp-info-eyebrow"');
    expect(flow).toContain('className="rp-info-body"');
    expect(flow).toContain("<EmailCard");
    expect(flow).not.toContain("<DeliveryCard");
  });

  it("contains no follower-facing SMS controls or copy", () => {
    expect(flow).not.toContain("MessageSquareText");
    expect(flow).not.toContain("Phone number");
    expect(flow).not.toContain("SMS is temporarily unavailable.");
    expect(flow).not.toContain("Add SMS");
    expect(flow).not.toContain("Change SMS");
    expect(flow).not.toContain("verifySms");
  });

  it("does not couple public enrollment to Twilio readiness", () => {
    expect(enrollment).not.toContain("smsReadiness");
    expect(enrollment).not.toContain("TWILIO_");
    expect(enrollment).not.toContain("supportedDeliveryMethods");
  });

  it("keeps verified SMS paused until final activation", () => {
    expect(smsPendingMigration).toContain("'paused'");
    expect(smsPendingMigration).not.toContain("set status = 'active'");
    expect(smsPendingMigration).not.toContain("follower_category_preferences");
    expect(smsPendingMigration).not.toContain("follower_notification_preferences");
  });

  it("links Email verification through one opaque management token", () => {
    expect(flow).toContain("preferenceToken: tokens.preferenceToken");
    expect(flow).toContain("preferenceToken: result.preferenceToken ?? value.preferenceToken");
  });

  it("provides a six-digit Email OTP and throttled resend experience", () => {
    expect(flow).toContain("We sent a 6-digit verification code to");
    expect(flow).toContain('autoComplete="one-time-code"');
    expect(flow).toContain('maxLength={6}');
    expect(flow).toContain('verifyEmail("resend")');
    expect(flow).toContain('String(resendSeconds).padStart(2, "0")');
  });
});
