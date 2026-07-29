import { describe, expect, it, vi } from "vitest";
import {
  buildWhatsAppRecoveryMessage,
  classifyWhatsAppFailure,
  createWhatsAppProvider,
} from "@/lib/delivery-providers/whatsapp-provider";
import type { DeliveryMessage } from "@/lib/delivery-providers/types";

const message: DeliveryMessage = {
  deliveryId: "delivery-1",
  transport: "whatsapp",
  destination: "+4915112345678",
  title: "Recovery",
  text: "Official recovery summary\n\nMore detail",
  notificationUrl: "https://audienceown.test/c/creator",
  statusCallbackUrl: "https://audienceown.test/api/webhooks/whatsapp/twilio",
  metadata: { updateId: "u1", creatorId: "c1", creatorName: "Creator" },
};

describe("WhatsApp provider", () => {
  it("builds stable Content variables and preserves the recovery URL", () => {
    expect(buildWhatsAppRecoveryMessage(message, `HX${"a".repeat(32)}`)).toEqual({
      contentSid: `HX${"a".repeat(32)}`,
      contentVariables: {
        "1": "Creator",
        "2": "Official recovery summary",
        "3": "https://audienceown.test/c/creator",
      },
      statusCallbackUrl: "https://audienceown.test/api/webhooks/whatsapp/twilio",
    });
  });

  it("prefixes only provider input and records accepted with Twilio SID", async () => {
    const sender = vi.fn().mockResolvedValue({ sid: `SM${"1".repeat(32)}` });
    const provider = createWhatsAppProvider({
      sender,
      from: "whatsapp:+14155238886",
      contentSid: `HX${"a".repeat(32)}`,
    });
    await expect(provider.send(message)).resolves.toMatchObject({
      ok: true,
      status: "accepted",
      provider: "twilio-whatsapp",
      providerMessageId: `SM${"1".repeat(32)}`,
    });
    expect(sender).toHaveBeenCalledWith(expect.objectContaining({
      from: "whatsapp:+14155238886",
      to: "whatsapp:+4915112345678",
      contentSid: `HX${"a".repeat(32)}`,
    }));
    expect(sender.mock.calls[0][0]).not.toHaveProperty("body");
  });

  it("keeps configuration and policy failures permanent", async () => {
    await expect(createWhatsAppProvider(null).send(message)).resolves.toMatchObject({
      ok: false, provider: "twilio-whatsapp", retryable: false,
    });
    expect(classifyWhatsAppFailure({ code: 63042 })).toEqual({
      code: "template_paused", retryable: false,
    });
    expect(classifyWhatsAppFailure({ status: 429 })).toEqual({
      code: "provider_rate_limited", retryable: true,
    });
    expect(classifyWhatsAppFailure({ status: 503 })).toEqual({
      code: "provider_temporary", retryable: true,
    });
  });
});
