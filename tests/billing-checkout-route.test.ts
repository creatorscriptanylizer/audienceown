import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOptionalViewer: vi.fn(),
  getCreator: vi.fn(),
  createAdminClient: vi.fn(),
  billingRecord: vi.fn(),
  checkoutCreate: vi.fn(),
  validateStripePrices: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({ getOptionalViewer: mocks.getOptionalViewer, getCreator: mocks.getCreator }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/billing/server", () => ({ billingRecord: mocks.billingRecord }));
vi.mock("@/lib/billing/stripe", () => ({
  stripeConfiguration: () => ({ STRIPE_SECRET_KEY: "configured", STRIPE_WEBHOOK_SECRET: "configured", STRIPE_PRO_MONTHLY_PRICE_ID: "price_monthly", STRIPE_PRO_YEARLY_PRICE_ID: "price_yearly" }),
  stripeClient: () => ({ checkout: { sessions: { create: mocks.checkoutCreate } } }),
  priceFor: (interval: "monthly" | "yearly") => interval === "monthly" ? "price_monthly" : "price_yearly",
  validateStripePrices: mocks.validateStripePrices,
}));
vi.mock("@/lib/debug", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/app-url", () => ({ appUrl: () => "https://audienceown.com" }));

import { POST } from "@/app/api/billing/checkout/route";

function checkoutRequest(interval: unknown, origin = "https://audienceown.com") {
  return new Request("http://next-internal:3000/api/billing/checkout", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ interval }),
  });
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.stubEnv("APP_URL", "https://audienceown.com");
    mocks.getOptionalViewer.mockResolvedValue({ id: "user-1", email: "creator@example.com" });
    mocks.getCreator.mockResolvedValue({ id: "creator-1", user_id: "user-1" });
    mocks.createAdminClient.mockReturnValue({});
    mocks.billingRecord.mockResolvedValue({ stripe_customer_id: "cus_existing", stripe_subscription_id: null, status: "inactive" });
    mocks.validateStripePrices.mockResolvedValue({ valid: true, mode: "test" });
    mocks.checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session" });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([
    ["monthly", "price_monthly"],
    ["yearly", "price_yearly"],
  ] as const)("creates the authenticated %s checkout with the canonical allowlisted price", async (interval, price) => {
    const response = await POST(checkoutRequest(interval));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.test/session" });
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        line_items: [{ price, quantity: 1 }],
        client_reference_id: "creator-1",
        metadata: { creatorId: "creator-1", billingInterval: interval },
      }),
      expect.any(Object),
    );
  });

  it("keeps foreign origins blocked before authentication and Stripe", async () => {
    const response = await POST(checkoutRequest("monthly", "https://evil.example"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid_origin" });
    expect(mocks.getOptionalViewer).not.toHaveBeenCalled();
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("keeps unauthenticated checkout blocked", async () => {
    mocks.getOptionalViewer.mockResolvedValue(null);
    const response = await POST(checkoutRequest("monthly"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("keeps malformed intervals blocked", async () => {
    const response = await POST(checkoutRequest("weekly"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_billing_interval" });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("does not accept a client-supplied creator identity", async () => {
    const response = await POST(new Request("http://next-internal:3000/api/billing/checkout", {
      method: "POST",
      headers: { origin: "https://audienceown.com", "content-type": "application/json" },
      body: JSON.stringify({ interval: "monthly", creatorId: "creator-2" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });
});
