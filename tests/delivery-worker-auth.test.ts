import { describe, expect, it } from "vitest";
import { isDeliveryWorkerAuthorized } from "@/lib/delivery-worker-auth";

describe("delivery worker authentication", () => {
  it("requires an exact bearer secret", () => {
    expect(isDeliveryWorkerAuthorized("Bearer worker-secret", "worker-secret")).toBe(true);
    expect(isDeliveryWorkerAuthorized("Bearer wrong-secret", "worker-secret")).toBe(false);
    expect(isDeliveryWorkerAuthorized(null, "worker-secret")).toBe(false);
  });

  it("is disabled when no server secret is configured", () => {
    expect(isDeliveryWorkerAuthorized("Bearer worker-secret", undefined)).toBe(false);
  });
});
