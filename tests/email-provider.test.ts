import { describe, expect, it } from "vitest";
import { createEmailProvider } from "@/lib/delivery-providers/email-provider";
import type { DeliveryMessage } from "@/lib/delivery-providers/types";

const message: DeliveryMessage = {
  deliveryId: "delivery-1",
  transport: "email",
  destination: "fan@example.com",
  subject: "Important update",
  title: "Update",
  text: "Plain text",
  html: "<p>Plain text</p>",
  metadata: { updateId: "update-1", creatorId: "creator-1" },
};

describe("email provider", () => {
  it("returns provider acceptance without a network dependency", async () => {
    const provider = createEmailProvider(async () => ({ id: "resend-message-1" }), "Creator <updates@example.com>");
    await expect(provider.send(message)).resolves.toEqual({
      ok: true,
      status: "accepted",
      provider: "resend",
      providerMessageId: "resend-message-1",
    });
  });

  it("attaches the internal delivery ID as provider metadata", async () => {
    let tags: Array<{ name: string; value: string }> = [];
    const provider = createEmailProvider(async (input) => {
      tags = input.tags;
      return { id: "resend-message-2" };
    }, "Creator <updates@example.com>");
    await provider.send(message);
    expect(tags).toEqual([{ name: "delivery_id", value: "delivery-1" }]);
  });

  it("classifies rate limits as temporary", async () => {
    const provider = createEmailProvider(async () => ({
      error: { name: "rate_limit_exceeded", statusCode: 429 },
    }), "updates@example.com");
    await expect(provider.send(message)).resolves.toMatchObject({
      ok: false,
      provider: "resend",
      retryable: true,
    });
  });

  it("classifies invalid requests as permanent", async () => {
    const provider = createEmailProvider(async () => ({
      error: { name: "validation_error", statusCode: 422 },
    }), "updates@example.com");
    await expect(provider.send(message)).resolves.toMatchObject({
      ok: false,
      provider: "resend",
      retryable: false,
    });
  });

  it("fails safely when email delivery is not configured", async () => {
    await expect(createEmailProvider(null, null).send(message)).resolves.toMatchObject({
      ok: false,
      code: "provider_not_configured",
      retryable: false,
    });
  });
});
