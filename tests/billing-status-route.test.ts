import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOptionalViewer: vi.fn(),
  getCreator: vi.fn(),
  getCreatorEntitlements: vi.fn(),
  billingRecord: vi.fn(),
  resolveCanonicalBillingState: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({
  getOptionalViewer: mocks.getOptionalViewer,
  getCreator: mocks.getCreator,
}));
vi.mock("@/lib/provider-entitlements", () => ({ getCreatorEntitlements: mocks.getCreatorEntitlements }));
vi.mock("@/lib/billing/server", () => ({ billingRecord: mocks.billingRecord }));
vi.mock("@/lib/billing/interval-switch", () => ({ resolveCanonicalBillingState: mocks.resolveCanonicalBillingState }));
vi.mock("@/lib/debug", () => ({ debugDatabaseError: vi.fn() }));

import { GET } from "@/app/api/billing/status/route";

function canonical(currentInterval: "monthly" | "yearly", pendingInterval: "monthly" | "yearly" | null = null) {
  return {
    currentInterval,
    pendingInterval,
    currentPeriodEnd: "2026-09-22T00:00:00.000Z",
    pendingEffectiveAt: pendingInterval ? "2026-09-22T00:00:00.000Z" : null,
  };
}

describe("GET /api/billing/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOptionalViewer.mockResolvedValue({ id: "user-1" });
    mocks.getCreator.mockResolvedValue({ id: "creator-1", owner_user_id: "user-1" });
    mocks.getCreatorEntitlements.mockResolvedValue({ plan: "free" });
    mocks.billingRecord.mockResolvedValue(null);
    mocks.resolveCanonicalBillingState.mockResolvedValue(canonical("monthly"));
  });

  it("returns only the minimal 401 response for an unauthenticated request", async () => {
    mocks.getOptionalViewer.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(mocks.getCreator).not.toHaveBeenCalled();
    expect(mocks.billingRecord).not.toHaveBeenCalled();
  });

  it("preserves the authenticated Free response", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ plan: "free", status: "inactive", billingInterval: "monthly", pendingInterval: null, currentPeriodEnd: "2026-09-22T00:00:00.000Z", pendingEffectiveAt: null, cancelAtPeriodEnd: false });
  });

  it.each(["monthly", "yearly"] as const)("preserves the authenticated Pro %s response", async (interval) => {
    mocks.getCreatorEntitlements.mockResolvedValue({ plan: "pro" });
    mocks.billingRecord.mockResolvedValue({ status: "active", cancel_at_period_end: false });
    mocks.resolveCanonicalBillingState.mockResolvedValue(canonical(interval));
    const response = await GET();
    expect(await response.json()).toMatchObject({ plan: "pro", status: "active", billingInterval: interval, pendingInterval: null, cancelAtPeriodEnd: false });
  });

  it("preserves pending interval and effective-date state", async () => {
    mocks.getCreatorEntitlements.mockResolvedValue({ plan: "pro" });
    mocks.billingRecord.mockResolvedValue({ status: "active", cancel_at_period_end: true });
    mocks.resolveCanonicalBillingState.mockResolvedValue(canonical("monthly", "yearly"));
    const response = await GET();
    expect(await response.json()).toMatchObject({ billingInterval: "monthly", pendingInterval: "yearly", pendingEffectiveAt: "2026-09-22T00:00:00.000Z", cancelAtPeriodEnd: true });
  });

  it("does not misclassify an unexpected viewer or creator lookup failure as unauthorized", async () => {
    mocks.getOptionalViewer.mockRejectedValueOnce(new Error("viewer_lookup_unavailable"));
    await expect(GET()).rejects.toThrow("viewer_lookup_unavailable");
    mocks.getOptionalViewer.mockResolvedValue({ id: "user-1" });
    mocks.getCreator.mockRejectedValueOnce(new Error("creator_lookup_unavailable"));
    await expect(GET()).rejects.toThrow("creator_lookup_unavailable");
  });
});
