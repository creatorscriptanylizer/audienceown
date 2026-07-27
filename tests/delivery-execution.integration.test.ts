import { describe, expect, it, vi } from "vitest";
import { dispatchClaimedDelivery } from "@/lib/delivery-dispatch-core";
import type { ClaimedDelivery } from "@/lib/delivery-message";

describe("delivery execution integration", () => {
  it("claims, accepts, records, and never dispatches the same delivery twice", async () => {
    let status: "queued" | "sending" | "sent" = "queued";
    let providerMessageId: string | null = null;
    const send = vi.fn().mockResolvedValue({
      ok: true,
      provider: "resend",
      providerMessageId: "resend-integration-1",
    });
    const claim = (): ClaimedDelivery | null => {
      if (status !== "queued") return null;
      status = "sending";
      return {
        delivery_id: "delivery-integration-1",
        update_id: "update-integration-1",
        creator_id: "creator-integration-1",
        transport: "email",
        destination: "fan@example.com",
        attempt_count: 1,
        broadcast_type: "account_update",
        title: "Access update",
        subject: "Access update",
        preview_text: "",
        content: "Your creator access location changed.",
        cta_label: null,
        cta_url: null,
        creator_display_name: "Integration Creator",
        creator_public_slug: "integration-creator",
      };
    };

    const delivery = claim();
    if (!delivery) throw new Error("fixture must be claimable");
    await dispatchClaimedDelivery(delivery, {
      appUrl: "https://audienceown.example",
      maxAttempts: 3,
      resolveProvider: () => ({ transport: "email", send }),
      async markSent(_deliveryId, _provider, messageId) {
        status = "sent";
        providerMessageId = messageId;
      },
      async markFailed() {
        throw new Error("successful fixture must not fail");
      },
    });

    expect(status).toBe("sent");
    expect(providerMessageId).toBe("resend-integration-1");
    expect(claim()).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
