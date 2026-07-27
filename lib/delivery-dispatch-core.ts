import { buildDeliveryMessage, type ClaimedDelivery } from "@/lib/delivery-message";
import type {
  DeliveryProvider,
  DeliveryProviderResult,
} from "@/lib/delivery-providers/types";
import type { DeliveryTransport } from "@/lib/update-recipients";

export type DispatchResult = {
  deliveryId: string;
  transport: DeliveryTransport;
  status: "sending" | "accepted" | "queued" | "failed";
  provider: string;
  retryable: boolean;
  code: string;
};

type DispatchDependencies = {
  appUrl: string;
  maxAttempts: number;
  resolveProvider(transport: DeliveryTransport): DeliveryProvider;
  markAccepted(deliveryId: string, provider: string, providerMessageId: string): Promise<void>;
  markFailed(input: {
    deliveryId: string;
    provider: string;
    code: string;
    reason: string;
    retryable: boolean;
    maxAttempts: number;
  }): Promise<"queued" | "failed">;
};

function expectedProvider(transport: DeliveryTransport) {
  return transport === "email" ? "resend" : "unsupported";
}

export async function dispatchClaimedDelivery(
  delivery: ClaimedDelivery,
  dependencies: DispatchDependencies,
): Promise<DispatchResult> {
  let providerResult: DeliveryProviderResult;
  try {
    const provider = dependencies.resolveProvider(delivery.transport);
    providerResult = await provider.send(buildDeliveryMessage(delivery, dependencies.appUrl));
  } catch {
    providerResult = {
      ok: false,
      provider: expectedProvider(delivery.transport),
      code: "provider_exception",
      reason: "The delivery provider failed unexpectedly.",
      retryable: true,
    };
  }

  if (providerResult.ok) {
    await dependencies.markAccepted(
      delivery.delivery_id,
      providerResult.provider,
      providerResult.providerMessageId,
    );
    return {
      deliveryId: delivery.delivery_id,
      transport: delivery.transport,
      status: "accepted",
      provider: providerResult.provider,
      retryable: false,
      code: "accepted",
    };
  }

  const status = await dependencies.markFailed({
    deliveryId: delivery.delivery_id,
    provider: providerResult.provider,
    code: providerResult.code,
    reason: providerResult.reason,
    retryable: providerResult.retryable,
    maxAttempts: dependencies.maxAttempts,
  });
  return {
    deliveryId: delivery.delivery_id,
    transport: delivery.transport,
    status,
    provider: providerResult.provider,
    retryable: providerResult.retryable && status === "queued",
    code: providerResult.code,
  };
}

export function aggregateDispatchResults(results: DispatchResult[]) {
  const transports: DeliveryTransport[] = ["email", "sms", "whatsapp", "browser_notification"];
  return {
    claimed: results.length,
    accepted: results.filter((result) => result.status === "accepted").length,
    retried: results.filter((result) => result.status === "queued").length,
    failed: results.filter((result) => result.status === "failed").length,
    unresolved: results.filter((result) => result.status === "sending").length,
    byTransport: Object.fromEntries(transports.map((transport) => [
      transport,
      results.filter((result) => result.transport === transport).length,
    ])) as Record<DeliveryTransport, number>,
    results,
  };
}
