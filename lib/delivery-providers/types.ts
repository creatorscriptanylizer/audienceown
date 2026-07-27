import type { DeliveryTransport } from "@/lib/update-recipients";

export type DeliveryMessage = {
  deliveryId: string;
  transport: DeliveryTransport;
  destination: string;
  title: string;
  body: string;
};

export type DeliveryProviderResult =
  | { ok: true; provider: string; providerMessageId: string }
  | { ok: false; provider: string; code: string; reason: string };

export interface DeliveryProvider {
  transport: DeliveryTransport;
  send(message: DeliveryMessage): Promise<DeliveryProviderResult>;
}
