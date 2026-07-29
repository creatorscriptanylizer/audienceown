export type DeliveryHealthMetrics = {
  queuedCount: number;
  stuckSendingCount: number;
  retryableFailedCount: number;
  pendingCallbackCount: number;
  oldestQueuedSeconds: number;
  recentPermanentFailureRate: number;
};

export type DeliveryHealthThresholds = {
  queueDepth: number;
  stuckCount: number;
  pendingCallbackCount: number;
  failureRatePercent: number;
  oldestQueueSeconds: number;
};

export const DEFAULT_DELIVERY_HEALTH_THRESHOLDS: DeliveryHealthThresholds = {
  queueDepth: 100,
  stuckCount: 1,
  pendingCallbackCount: 10,
  failureRatePercent: 20,
  oldestQueueSeconds: 900,
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function deliveryHealthThresholds(
  environment: NodeJS.ProcessEnv = process.env,
): DeliveryHealthThresholds {
  return {
    queueDepth: positiveNumber(environment.DELIVERY_ALERT_QUEUE_DEPTH, 100),
    stuckCount: positiveNumber(environment.DELIVERY_ALERT_STUCK_COUNT, 1),
    pendingCallbackCount: positiveNumber(environment.DELIVERY_ALERT_PENDING_CALLBACK_COUNT, 10),
    failureRatePercent: positiveNumber(environment.DELIVERY_ALERT_FAILURE_RATE_PERCENT, 20),
    oldestQueueSeconds: positiveNumber(environment.DELIVERY_ALERT_OLDEST_QUEUE_SECONDS, 900),
  };
}

export function classifyDeliveryHealth(
  metrics: DeliveryHealthMetrics,
  thresholds = DEFAULT_DELIVERY_HEALTH_THRESHOLDS,
): "ok" | "degraded" | "unhealthy" {
  const ratios = [
    metrics.queuedCount / thresholds.queueDepth,
    metrics.stuckSendingCount / thresholds.stuckCount,
    metrics.pendingCallbackCount / thresholds.pendingCallbackCount,
    metrics.recentPermanentFailureRate / thresholds.failureRatePercent,
    metrics.oldestQueuedSeconds / thresholds.oldestQueueSeconds,
  ];
  if (ratios.some((ratio) => ratio >= 2)) return "unhealthy";
  if (ratios.some((ratio) => ratio >= 1)) return "degraded";
  return "ok";
}

export function safeRate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round(numerator * 10_000 / denominator) / 100 : 0;
}

const creatorFailureCopy: Record<string, string> = {
  invalid_destination: "The saved recovery destination is no longer valid.",
  not_whatsapp_capable: "The saved recovery destination is no longer valid.",
  opted_out: "The follower is no longer eligible for this recovery channel.",
  not_opted_in: "The follower is no longer eligible for this recovery channel.",
  blocked_destination: "The follower is no longer eligible for this recovery channel.",
  template_not_approved: "The WhatsApp recovery template is not currently available.",
  template_paused: "The WhatsApp recovery template is not currently available.",
  template_disabled: "The WhatsApp recovery template is not currently available.",
  provider_temporary: "The provider experienced a temporary issue.",
  temporary_provider_failure: "The provider experienced a temporary issue.",
  provider_configuration: "This recovery channel is temporarily unavailable.",
  provider_not_configured: "This recovery channel is temporarily unavailable.",
};

export function creatorSafeFailureCopy(code: string | null) {
  return code ? creatorFailureCopy[code] ?? "Could not be delivered." : "Could not be delivered.";
}

export function isRetryEligible(input: {
  status: string;
  attemptCount: number;
  failureCode: string | null;
  providerMessageIdPresent?: boolean;
}) {
  return input.status === "failed"
    && input.attemptCount < 3
    && !input.providerMessageIdPresent
    && [
      "temporary_provider_failure", "provider_temporary", "rate_limited",
      "provider_rate_limited", "state_update_failed",
    ].includes(input.failureCode ?? "");
}

export function isStuckDelivery(input: {
  status: string;
  sendingAt: string | null;
}, now = Date.now(), timeoutSeconds = 900) {
  return input.status === "sending"
    && Boolean(input.sendingAt)
    && now - new Date(input.sendingAt!).getTime() >= timeoutSeconds * 1000;
}
