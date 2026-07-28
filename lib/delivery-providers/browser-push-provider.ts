import { createHash } from "node:crypto";
import type {
  DeliveryMessage,
  DeliveryProvider,
  DeliveryProviderResult,
} from "@/lib/delivery-providers/types";

export type BrowserPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
};

export type BrowserPushSendResult = { statusCode: number; headers?: Record<string, string> };

export type BrowserPushDependencies = {
  loadSubscription(reference: string): Promise<BrowserPushSubscription | null>;
  send(subscription: BrowserPushSubscription, payload: string): Promise<BrowserPushSendResult>;
  markSuccess(reference: string): Promise<void>;
  markPermanentFailure(reference: string): Promise<void>;
  markFailure(reference: string): Promise<void>;
};

export function buildBrowserNotificationPayload(message: DeliveryMessage) {
  const emergency = message.title.toLowerCase().includes("inaccessible")
    || message.title.toLowerCase().includes("recovery");
  return {
    title: (emergency ? message.title : `Update from ${message.title}`).slice(0, 100),
    body: message.text.split("\n")[0].trim().slice(0, 240),
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: `audienceown:${message.metadata.updateId}`,
    url: message.notificationUrl ?? "/",
    updateId: message.metadata.updateId,
    creatorHandle: message.metadata.creatorHandle,
  };
}

function statusResult(statusCode: number): Pick<Extract<DeliveryProviderResult, { ok: false }>, "code" | "reason" | "retryable"> {
  if (statusCode === 404 || statusCode === 410) {
    return {
      code: "push_subscription_gone",
      reason: "The browser push subscription is no longer active.",
      retryable: false,
    };
  }
  if (statusCode === 429) {
    return {
      code: "push_rate_limited",
      reason: "The browser push service is temporarily rate limited.",
      retryable: true,
    };
  }
  if (statusCode >= 500) {
    return {
      code: "push_service_unavailable",
      reason: "The browser push service is temporarily unavailable.",
      retryable: true,
    };
  }
  return {
    code: "push_provider_rejected",
    reason: "The browser push service rejected this notification.",
    retryable: false,
  };
}

export function createBrowserPushProvider(
  dependencies: BrowserPushDependencies | null,
): DeliveryProvider {
  return {
    transport: "browser_notification",
    async send(message: DeliveryMessage): Promise<DeliveryProviderResult> {
      if (!dependencies) {
        return {
          ok: false,
          provider: "web-push",
          code: "provider_not_configured",
          reason: "Browser push delivery is not configured.",
          retryable: false,
        };
      }
      const subscription = await dependencies.loadSubscription(message.destination);
      if (!subscription) {
        return {
          ok: false,
          provider: "web-push",
          code: "push_subscription_inactive",
          reason: "The browser push subscription is not active.",
          retryable: false,
        };
      }
      try {
        const result = await dependencies.send(
          subscription,
          JSON.stringify(buildBrowserNotificationPayload(message)),
        );
        if (result.statusCode >= 200 && result.statusCode < 300) {
          await dependencies.markSuccess(message.destination);
          return {
            ok: true,
            status: "accepted",
            provider: "web-push",
            providerMessageId: createHash("sha256")
              .update(`${message.deliveryId}:${message.destination}:${Date.now()}`)
              .digest("hex"),
          };
        }
        const failure = statusResult(result.statusCode);
        if (result.statusCode === 404 || result.statusCode === 410) {
          await dependencies.markPermanentFailure(message.destination);
        } else {
          await dependencies.markFailure(message.destination);
        }
        return { ok: false, provider: "web-push", ...failure };
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error
          ? Number(error.statusCode)
          : 0;
        const failure = statusCode ? statusResult(statusCode) : {
          code: "push_network_error",
          reason: "The browser push service could not be reached.",
          retryable: true,
        };
        if (statusCode === 404 || statusCode === 410) {
          await dependencies.markPermanentFailure(message.destination);
        } else {
          await dependencies.markFailure(message.destination);
        }
        return { ok: false, provider: "web-push", ...failure };
      }
    },
  };
}
