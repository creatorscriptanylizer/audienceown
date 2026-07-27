import type { DeliveryTransport } from "@/lib/update-recipients";

export type DeliveryMessage = {
  deliveryId: string;
  transport: DeliveryTransport;
  destination: string;
  subject?: string;
  title: string;
  text: string;
  html?: string;
  metadata: {
    updateId: string;
    creatorId: string;
  };
};

export type ProviderAcceptedResult = {
  ok: true;
  status: "accepted";
  provider: string;
  providerMessageId: string;
};

export type DeliveryProviderResult =
  | ProviderAcceptedResult
  | { ok: false; provider: string; code: string; reason: string; retryable: boolean };

export interface DeliveryProvider {
  transport: DeliveryTransport;
  send(message: DeliveryMessage): Promise<DeliveryProviderResult>;
}
