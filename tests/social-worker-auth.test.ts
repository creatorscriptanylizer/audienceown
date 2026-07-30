import { describe, expect, it } from "vitest";
import { isDeliveryWorkerAuthorized } from "@/lib/delivery-worker-auth";

describe("social worker authentication", () => {
  it("fails closed and accepts only the exact bearer secret", () => {
    expect(isDeliveryWorkerAuthorized("Bearer social-secret", "social-secret")).toBe(true);
    expect(isDeliveryWorkerAuthorized("Bearer wrong", "social-secret")).toBe(false);
    expect(isDeliveryWorkerAuthorized("Bearer social-secret", undefined)).toBe(false);
  });
});
