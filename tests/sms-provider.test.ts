import { describe, expect, it, vi } from "vitest";
import {
  buildSmsMessage,
  classifyTwilioFailure,
  createSmsProvider,
  SMS_MAX_CHARACTERS,
} from "@/lib/delivery-providers/sms-provider";
import type { DeliveryMessage } from "@/lib/delivery-providers/types";

const message: DeliveryMessage = {
  deliveryId: "delivery-1",
  transport: "sms",
  destination: "+14155552671",
  title: "Recovery alert",
  text: "The creator’s account is temporarily inaccessible.",
  notificationUrl: "https://audienceown.example/c/creator",
  statusCallbackUrl: "https://audienceown.example/api/webhooks/sms/twilio",
  metadata: {
    updateId: "update-1",
    creatorId: "creator-1",
    creatorName: "Creator Name",
  },
};

describe("SMS provider", () => {
  it("builds a concise deterministic recovery message with the safe URL", () => {
    expect(buildSmsMessage(message)).toBe(
      "AudienceOwn · Creator Name\n\n"
      + "The creator’s account is temporarily inaccessible.\n\n"
      + "Open: https://audienceown.example/c/creator",
    );
    expect(buildSmsMessage(message)).toBe(buildSmsMessage(message));
  });

  it.each(["短い名前", "Créateur 🚀"])("preserves Unicode creator names: %s", (creatorName) => {
    const body = buildSmsMessage({ ...message, metadata: { ...message.metadata, creatorName } });
    expect(body).toContain(creatorName);
    expect(body).toContain(message.notificationUrl);
  });

  it("truncates long content while retaining the URL", () => {
    const body = buildSmsMessage({ ...message, text: "x".repeat(2000) });
    expect(body.length).toBeLessThanOrEqual(SMS_MAX_CHARACTERS);
    expect(body).toContain(message.notificationUrl);
    expect(body).toContain("…");
  });

  it("returns accepted with Twilio's authoritative message SID", async () => {
    const send = vi.fn().mockResolvedValue({ sid: "SM123" });
    const result = await createSmsProvider(send).send(message);
    expect(result).toEqual({
      ok: true,
      status: "accepted",
      provider: "twilio",
      providerMessageId: "SM123",
    });
    expect(result).not.toHaveProperty("status", "delivered");
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: message.destination,
      statusCallback: message.statusCallbackUrl,
    }));
  });

  it.each([
    [{ code: 21211 }, "invalid_destination", false],
    [{ code: 21610 }, "opted_out", false],
    [{ code: 20003 }, "provider_configuration", false],
    [{ status: 429 }, "rate_limited", true],
    [{ status: 503 }, "temporary_provider_failure", true],
  ])("classifies provider failure %#", (error, code, retryable) => {
    expect(classifyTwilioFailure(error)).toEqual({ code, retryable });
  });
});
