import { createHash } from "node:crypto";
import twilio from "twilio";

export const TWILIO_OPT_OUT_KEYWORDS = new Set([
  "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
]);
export const WHATSAPP_OPT_OUT_KEYWORDS = new Set([
  "STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REMOVE",
]);

export type TwilioStatusEvent = {
  provider: "twilio" | "twilio-whatsapp";
  providerEventId: string;
  providerMessageId: string;
  rawStatus: string;
  normalizedStatus: "accepted" | "delivered" | "failed" | "ignored";
  errorCode: string | null;
  failureCategory: string | null;
};

export function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
) {
  return twilio.validateRequest(authToken, signature, url, params);
}

export function normalizeTwilioStatus(
  params: Record<string, string>,
  provider: TwilioStatusEvent["provider"] = "twilio",
): TwilioStatusEvent | null {
  const messageSid = params.MessageSid?.trim();
  const rawStatus = params.MessageStatus?.trim().toLowerCase();
  if (!messageSid || !rawStatus) return null;
  const normalizedStatus = ["queued", "accepted", "scheduled", "sending", "sent"].includes(rawStatus)
    ? "accepted"
    : rawStatus === "delivered" || (provider === "twilio-whatsapp" && rawStatus === "read")
      ? "delivered"
      : ["undelivered", "failed"].includes(rawStatus)
        ? "failed"
        : "ignored";
  const errorCode = params.ErrorCode?.trim() || null;
  const failureCategory = classifyTwilioCallbackFailure(errorCode);
  const providerEventId = createHash("sha256")
    .update(`${messageSid}:${rawStatus}:${errorCode ?? ""}`)
    .digest("hex");
  return {
    provider,
    providerEventId,
    providerMessageId: messageSid,
    rawStatus,
    normalizedStatus,
    errorCode,
    failureCategory,
  };
}

export function classifyTwilioCallbackFailure(errorCode: string | null) {
  if (!errorCode) return null;
  if (["21211", "21612", "21614", "30003", "30005", "30006"].includes(errorCode)) {
    return "invalid_destination";
  }
  if (["21610", "30004", "30007"].includes(errorCode)) return "blocked_destination";
  if (["30001", "30002", "30008"].includes(errorCode)) return "temporary_provider_failure";
  return "unknown_provider_failure";
}

export function isSmsOptOutKeyword(body: string) {
  return TWILIO_OPT_OUT_KEYWORDS.has(body.trim().toUpperCase());
}

export function isWhatsAppOptOutKeyword(body: string) {
  return WHATSAPP_OPT_OUT_KEYWORDS.has(body.trim().toUpperCase());
}

export function formParams(rawBody: string) {
  const entries = new URLSearchParams(rawBody);
  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (Object.hasOwn(result, key)) return null;
    result[key] = value;
  }
  return result;
}
