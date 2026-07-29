import { describe, expect, it } from "vitest";
import {
  canonicalWhatsAppSender,
  whatsappReadiness,
} from "@/lib/whatsapp-readiness";

const valid = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://audienceown.test",
  TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
  TWILIO_AUTH_TOKEN: "x".repeat(32),
  TWILIO_VERIFY_SERVICE_SID: `VA${"b".repeat(32)}`,
  TWILIO_WHATSAPP_SENDER: "whatsapp:+14155238886",
  TWILIO_WHATSAPP_RECOVERY_CONTENT_SID: `HX${"c".repeat(32)}`,
  CONTACT_ENCRYPTION_KEY: "k".repeat(32),
} satisfies NodeJS.ProcessEnv;

describe("WhatsApp readiness", () => {
  it("validates sender prefix, canonical E.164, and Content SID", () => {
    expect(whatsappReadiness(valid)).toEqual({
      outbound: "configured", otp: "configured", webhook: "configured",
    });
    expect(canonicalWhatsAppSender("+14155238886")).toBeNull();
    expect(canonicalWhatsAppSender("whatsapp:4155238886")).toBeNull();
    expect(whatsappReadiness({
      ...valid,
      TWILIO_WHATSAPP_RECOVERY_CONTENT_SID: "bad",
    }).outbound).toBe("invalid_configuration");
  });

  it("is independent from SMS messaging configuration", () => {
    expect(whatsappReadiness(valid).outbound).toBe("configured");
    expect(("TWILIO_MESSAGING_SERVICE_SID" in valid)).toBe(false);
  });
});
