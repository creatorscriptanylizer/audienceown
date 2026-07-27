import type { DeliveryTransport } from "@/lib/update-recipients";
import type {
  DeliveryProvider,
  DeliveryProviderResult,
} from "@/lib/delivery-providers/types";

class UnsupportedDeliveryProvider implements DeliveryProvider {
  constructor(public readonly transport: DeliveryTransport) {}

  async send(): Promise<DeliveryProviderResult> {
    return {
      ok: false,
      provider: "unsupported",
      code: "provider_not_configured",
      reason: `No ${this.transport} delivery provider is configured.`,
    };
  }
}

export function getDeliveryProvider(transport: DeliveryTransport): DeliveryProvider {
  return new UnsupportedDeliveryProvider(transport);
}
