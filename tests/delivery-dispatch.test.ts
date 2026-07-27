import { describe, expect, it, vi } from "vitest";
import {
  aggregateDispatchResults,
  dispatchClaimedDelivery,
} from "@/lib/delivery-dispatch-core";
import type { ClaimedDelivery } from "@/lib/delivery-message";
import type { DeliveryProviderResult } from "@/lib/delivery-providers/types";

const claimed: ClaimedDelivery = {
  delivery_id: "delivery-1",
  update_id: "update-1",
  creator_id: "creator-1",
  transport: "email",
  destination: "private@example.com",
  attempt_count: 1,
  broadcast_type: "account_update",
  title: "Update",
  subject: "Subject",
  preview_text: "",
  content: "Message",
  cta_label: null,
  cta_url: null,
  creator_display_name: "Creator",
  creator_public_slug: "creator",
};

function dependencies(result: DeliveryProviderResult) {
  return {
    appUrl: "https://audienceown.example",
    maxAttempts: 3,
    resolveProvider: () => ({ transport: "email" as const, send: vi.fn().mockResolvedValue(result) }),
    markSent: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(result.ok || !result.retryable ? "failed" : "queued"),
  };
}

describe("delivery dispatcher", () => {
  it("records provider acceptance as sent", async () => {
    const deps = dependencies({ ok: true, provider: "resend", providerMessageId: "message-1" });
    const result = await dispatchClaimedDelivery(claimed, deps);
    expect(result).toMatchObject({ status: "sent", provider: "resend", code: "accepted" });
    expect(deps.markSent).toHaveBeenCalledWith("delivery-1", "resend", "message-1");
    expect(result).not.toHaveProperty("destination");
  });

  it("requeues temporary failures", async () => {
    const deps = dependencies({
      ok: false, provider: "resend", code: "rate_limit", reason: "Retry.", retryable: true,
    });
    await expect(dispatchClaimedDelivery(claimed, deps)).resolves.toMatchObject({
      status: "queued", retryable: true,
    });
  });

  it("records permanent failures", async () => {
    const deps = dependencies({
      ok: false, provider: "resend", code: "invalid", reason: "Rejected.", retryable: false,
    });
    await expect(dispatchClaimedDelivery(claimed, deps)).resolves.toMatchObject({
      status: "failed", retryable: false,
    });
  });

  it("turns an unexpected provider exception into a retryable failure", async () => {
    const markFailed = vi.fn().mockResolvedValue("queued" as const);
    const result = await dispatchClaimedDelivery(claimed, {
      appUrl: "https://audienceown.example",
      maxAttempts: 3,
      resolveProvider: () => ({ transport: "email", send: vi.fn().mockRejectedValue(new Error("secret")) }),
      markSent: vi.fn(),
      markFailed,
    });
    expect(result).toMatchObject({ status: "queued", code: "provider_exception" });
    expect(markFailed).toHaveBeenCalledWith(expect.objectContaining({
      reason: "The delivery provider failed unexpectedly.",
      retryable: true,
    }));
  });

  it("never falls back to email for unsupported transports", async () => {
    for (const transport of ["sms", "whatsapp", "browser_notification"] as const) {
      const result = await dispatchClaimedDelivery({ ...claimed, transport }, {
        ...dependencies({
          ok: false,
          provider: "unsupported",
          code: "provider_not_configured",
          reason: "Unsupported.",
          retryable: false,
        }),
        resolveProvider: (resolved) => {
          expect(resolved).toBe(transport);
          return {
            transport,
            send: vi.fn().mockResolvedValue({
              ok: false,
              provider: "unsupported",
              code: "provider_not_configured",
              reason: "Unsupported.",
              retryable: false,
            }),
          };
        },
      });
      expect(result).toMatchObject({ transport, status: "failed", provider: "unsupported" });
    }
  });

  it("aggregates a bounded batch without private destinations", () => {
    const summary = aggregateDispatchResults([
      { deliveryId: "1", transport: "email", status: "sent", provider: "resend", retryable: false, code: "accepted" },
      { deliveryId: "2", transport: "sms", status: "failed", provider: "unsupported", retryable: false, code: "provider_not_configured" },
    ]);
    expect(summary).toMatchObject({
      claimed: 2,
      sent: 1,
      retried: 0,
      failed: 1,
      byTransport: { email: 1, sms: 1, whatsapp: 0, browser_notification: 0 },
    });
    expect(JSON.stringify(summary)).not.toContain("private@example.com");
  });
});
