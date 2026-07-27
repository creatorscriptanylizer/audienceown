export type NormalizedDeliveryEvent = {
  provider: "resend";
  providerEventId: string;
  providerMessageId: string | null;
  type: "accepted" | "delivered" | "bounced" | "complained" | "ignored";
  occurredAt: string | null;
  rawType: string;
  errorCode: string | null;
  errorMessage: string | null;
};
