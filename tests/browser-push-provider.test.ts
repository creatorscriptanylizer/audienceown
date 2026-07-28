import { describe, expect, it, vi } from "vitest";
import {
  buildBrowserNotificationPayload,
  createBrowserPushProvider,
  type BrowserPushDependencies,
} from "@/lib/delivery-providers/browser-push-provider";
import type { DeliveryMessage } from "@/lib/delivery-providers/types";

const message: DeliveryMessage = {
  deliveryId: "delivery-1",
  transport: "browser_notification",
  destination: "subscription-record-1",
  title: "Account inaccessible — Creator Name",
  text: "Creator Name reported that their YouTube account is inaccessible.\n\nprivate long body",
  notificationUrl: "https://audienceown.example/c/creator",
  metadata: {
    updateId: "update-1",
    creatorId: "creator-1",
    creatorHandle: "creator",
  },
};

function dependencies(statusCode: number): BrowserPushDependencies {
  return {
    loadSubscription: vi.fn().mockResolvedValue({
      endpoint: "https://push.example/subscription",
      keys: { p256dh: "public-key", auth: "auth-key" },
    }),
    send: vi.fn().mockResolvedValue({ statusCode }),
    markSuccess: vi.fn(),
    markPermanentFailure: vi.fn(),
    markFailure: vi.fn(),
  };
}

describe("BrowserPushProvider", () => {
  it("builds a concise safe notification payload without subscription secrets", () => {
    const payload = buildBrowserNotificationPayload(message);
    expect(payload).toMatchObject({
      title: message.title,
      body: "Creator Name reported that their YouTube account is inaccessible.",
      tag: "audienceown:update-1",
      url: message.notificationUrl,
      updateId: "update-1",
    });
    expect(JSON.stringify(payload)).not.toContain("subscription-record-1");
    expect(JSON.stringify(payload)).not.toContain("private long body");
  });

  it("returns accepted with an internal submission id and never delivered", async () => {
    const deps = dependencies(201);
    const result = await createBrowserPushProvider(deps).send(message);
    expect(result).toMatchObject({ ok: true, status: "accepted", provider: "web-push" });
    expect(result).not.toHaveProperty("status", "delivered");
    expect(result.ok && result.providerMessageId).toMatch(/^[a-f0-9]{64}$/);
    expect(deps.markSuccess).toHaveBeenCalledWith(message.destination);
  });

  it.each([404, 410])("revokes a permanently invalid subscription on %s", async (statusCode) => {
    const deps = dependencies(statusCode);
    const result = await createBrowserPushProvider(deps).send(message);
    expect(result).toMatchObject({
      ok: false,
      provider: "web-push",
      code: "push_subscription_gone",
      retryable: false,
    });
    expect(deps.markPermanentFailure).toHaveBeenCalledWith(message.destination);
  });

  it.each([
    [429, "push_rate_limited"],
    [500, "push_service_unavailable"],
    [503, "push_service_unavailable"],
  ])("uses bounded dispatcher retry semantics for %s", async (statusCode, code) => {
    const result = await createBrowserPushProvider(dependencies(statusCode)).send(message);
    expect(result).toMatchObject({ ok: false, code, retryable: true });
  });

  it("fails safely when the subscription is revoked", async () => {
    const deps = dependencies(201);
    vi.mocked(deps.loadSubscription).mockResolvedValue(null);
    await expect(createBrowserPushProvider(deps).send(message)).resolves.toMatchObject({
      ok: false,
      code: "push_subscription_inactive",
      retryable: false,
    });
    expect(deps.send).not.toHaveBeenCalled();
  });
});
