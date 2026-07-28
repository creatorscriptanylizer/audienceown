import { describe, expect, it, vi } from "vitest";
import { resolveDeliveryProvider } from "@/lib/delivery-providers/resolver";
import type { DeliveryProvider } from "@/lib/delivery-providers/types";
import { deliveryTransports } from "@/lib/update-recipients";

describe("delivery provider resolver", () => {
  const emailProvider: DeliveryProvider = {
    transport: "email",
    async send() {
      return { ok: true, status: "accepted", provider: "resend", providerMessageId: "message-1" };
    },
  };
  const browserPushProvider: DeliveryProvider = {
    transport: "browser_notification",
    send: vi.fn(),
  };
  const smsProvider: DeliveryProvider = {
    transport: "sms",
    send: vi.fn(),
  };

  it.each(deliveryTransports)("resolves %s without cross-transport fallback", async (transport) => {
    const provider = resolveDeliveryProvider(transport, emailProvider);
    expect(provider.transport).toBe(transport);
    const result = await provider.send({
      deliveryId: "delivery-1",
      transport,
      destination: "masked-reference",
      title: "Title",
      text: "Body",
      metadata: { updateId: "update-1", creatorId: "creator-1" },
    });
    if (transport === "email") {
      expect(result).toEqual({
        ok: true,
        status: "accepted",
        provider: "resend",
        providerMessageId: "message-1",
      });
      return;
    }
    expect(result).toEqual({
      ok: false,
      provider: "unsupported",
      code: "provider_not_configured",
      reason: `No ${transport} delivery provider is configured.`,
      retryable: false,
    });
  });

  it("resolves browser_notification to BrowserPushProvider when configured", () => {
    expect(resolveDeliveryProvider(
      "browser_notification",
      emailProvider,
      browserPushProvider,
    )).toBe(browserPushProvider);
  });

  it("resolves sms to SMSProvider when configured", () => {
    expect(resolveDeliveryProvider(
      "sms",
      emailProvider,
      browserPushProvider,
      smsProvider,
    )).toBe(smsProvider);
  });
});
