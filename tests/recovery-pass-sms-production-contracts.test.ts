import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const verification = readFileSync(`${root}/supabase/functions/sms-verification/index.ts`, "utf8");
const replacement = readFileSync(`${root}/supabase/migrations/20260928000003_recovery_pass_sms_pending_activation.sql`, "utf8");
const optionalTransport = readFileSync(`${root}/supabase/migrations/20260928000004_selected_transport_for_optional_updates.sql`, "utf8");

describe("Recovery Pass SMS production contracts", () => {
  it("uses Twilio Verify with E.164 parsing, six-digit codes, and bounded abuse controls", () => {
    expect(verification).toContain('parsePhoneNumberFromString');
    expect(verification).toContain('Channel: "sms"');
    expect(verification).toContain('/^[0-9]{6}$/');
    expect(verification).toContain('session.attempt_count >= 6');
    expect(verification).toContain('session.resend_count >= 3');
    expect(verification).toContain('destinationCount ?? 0) >= 5');
  });

  it("does not replace an active SMS destination until the new OTP is approved", () => {
    const providerApproval = verification.indexOf('checked.data.status !== "approved"');
    const completionRpc = verification.indexOf('activate_sms_recovery_pass');
    expect(providerApproval).toBeGreaterThan(-1);
    expect(completionRpc).toBeGreaterThan(providerApproval);
    expect(replacement).toContain("follower_connection_id");
    expect(replacement).toContain("set method_status = 'revoked', consent_revoked_at = now()");
    expect(replacement).toContain("set follower_contact_id = connection_row.follower_contact_id");
  });

  it("routes eligible optional updates through the selected verified SMS method", () => {
    expect(optionalTransport).toContain("when selected_method_type = 'sms' then 'sms'");
    expect(optionalTransport).toContain("when update_type <> 'account_update' then 'email'");
  });
});
