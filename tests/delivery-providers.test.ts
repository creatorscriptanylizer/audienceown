import { describe, expect, it } from "vitest";
import { getDeliveryProvider } from "@/lib/delivery-providers/unsupported";
import { deliveryTransports } from "@/lib/update-recipients";

describe("delivery provider resolver", () => {
  it.each(deliveryTransports)("returns a safe unsupported %s provider", async (transport) => {
    const provider = getDeliveryProvider(transport);
    expect(provider.transport).toBe(transport);
    await expect(provider.send({
      deliveryId: "delivery-1",
      transport,
      destination: "masked-reference",
      title: "Title",
      body: "Body",
    })).resolves.toEqual({
      ok: false,
      provider: "unsupported",
      code: "provider_not_configured",
      reason: `No ${transport} delivery provider is configured.`,
    });
  });
});
