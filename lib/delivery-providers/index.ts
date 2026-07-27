import "server-only";

import { createConfiguredEmailProvider } from "@/lib/delivery-providers/email";
import { resolveDeliveryProvider } from "@/lib/delivery-providers/resolver";
import type { DeliveryTransport } from "@/lib/update-recipients";

export function getDeliveryProvider(transport: DeliveryTransport) {
  return resolveDeliveryProvider(transport, createConfiguredEmailProvider());
}
