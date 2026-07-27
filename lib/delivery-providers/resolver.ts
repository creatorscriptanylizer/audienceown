import { getDeliveryProvider as getUnsupportedProvider } from "@/lib/delivery-providers/unsupported";
import type { DeliveryProvider } from "@/lib/delivery-providers/types";
import type { DeliveryTransport } from "@/lib/update-recipients";

export function resolveDeliveryProvider(
  transport: DeliveryTransport,
  emailProvider: DeliveryProvider,
) {
  return transport === "email" ? emailProvider : getUnsupportedProvider(transport);
}
