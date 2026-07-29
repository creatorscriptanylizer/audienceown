import { describe, expect, it } from "vitest";
import {
  classifyDeliveryHealth,
  creatorSafeFailureCopy,
  deliveryHealthThresholds,
  isRetryEligible,
  isStuckDelivery,
  safeRate,
} from "@/lib/delivery-health";

const healthy = {
  queuedCount: 0,
  stuckSendingCount: 0,
  retryableFailedCount: 0,
  pendingCallbackCount: 0,
  oldestQueuedSeconds: 0,
  recentPermanentFailureRate: 0,
};

describe("delivery health", () => {
  it("classifies exact threshold boundaries", () => {
    expect(classifyDeliveryHealth(healthy)).toBe("ok");
    expect(classifyDeliveryHealth({ ...healthy, queuedCount: 100 })).toBe("degraded");
    expect(classifyDeliveryHealth({ ...healthy, queuedCount: 200 })).toBe("unhealthy");
  });

  it("uses safe defaults for invalid configuration", () => {
    expect(deliveryHealthThresholds({
      DELIVERY_ALERT_QUEUE_DEPTH: "invalid",
      DELIVERY_ALERT_STUCK_COUNT: "0",
    } as unknown as NodeJS.ProcessEnv)).toMatchObject({ queueDepth: 100, stuckCount: 1 });
  });

  it("handles zero denominator rates", () => {
    expect(safeRate(0, 0)).toBe(0);
    expect(safeRate(1, 4)).toBe(25);
  });

  it("maps internal failures to creator-safe copy", () => {
    expect(creatorSafeFailureCopy("invalid_destination")).toContain("no longer valid");
    expect(creatorSafeFailureCopy("template_disabled")).not.toContain("630");
    expect(creatorSafeFailureCopy("unexpected_secret_detail")).toBe("Could not be delivered.");
  });

  it("permits only transient, uncorrelated failures below the attempt ceiling", () => {
    expect(isRetryEligible({
      status: "failed", attemptCount: 2, failureCode: "provider_temporary",
    })).toBe(true);
    expect(isRetryEligible({
      status: "failed", attemptCount: 3, failureCode: "provider_temporary",
    })).toBe(false);
    expect(isRetryEligible({
      status: "failed", attemptCount: 1, failureCode: "invalid_destination",
    })).toBe(false);
    expect(isRetryEligible({
      status: "failed", attemptCount: 1, failureCode: "provider_temporary",
      providerMessageIdPresent: true,
    })).toBe(false);
  });

  it("uses the canonical fifteen-minute stuck boundary", () => {
    const now = Date.parse("2026-08-06T12:00:00Z");
    expect(isStuckDelivery({
      status: "sending", sendingAt: "2026-08-06T11:45:00Z",
    }, now)).toBe(true);
    expect(isStuckDelivery({
      status: "sending", sendingAt: "2026-08-06T11:45:01Z",
    }, now)).toBe(false);
    expect(isStuckDelivery({
      status: "delivered", sendingAt: "2026-08-06T10:00:00Z",
    }, now)).toBe(false);
  });
});
