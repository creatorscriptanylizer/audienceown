import { getDeliveryProvider as getUnsupportedProvider } from "@/lib/delivery-providers/unsupported";
import type { DeliveryProvider } from "@/lib/delivery-providers/types";
import type { DeliveryTransport } from "@/lib/update-recipients";

export function resolveDeliveryProvider(
  transport: DeliveryTransport,
  emailProvider: DeliveryProvider,
  browserPushProvider?: DeliveryProvider,
  smsProvider?: DeliveryProvider,
  whatsappProvider?: DeliveryProvider,
) {
  const registry = new Map(
    [emailProvider, browserPushProvider, smsProvider, whatsappProvider]
      .filter((provider): provider is DeliveryProvider => Boolean(provider))
      .map((provider) => [provider.transport, provider]),
  );
  return registry.get(transport) ?? getUnsupportedProvider(transport);
}
