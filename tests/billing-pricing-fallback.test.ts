import { beforeEach, describe, expect, it, vi } from "vitest";

const {debugLog}=vi.hoisted(()=>({debugLog:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/debug",()=>({debugLog}));
vi.mock("@/lib/billing/stripe",()=>({
  canonicalProDisplayPrices:{monthly:{interval:"monthly",unitAmount:1200,currency:"usd",recurringInterval:"month"},yearly:{interval:"yearly",unitAmount:12000,currency:"usd",recurringInterval:"year"}},
  priceFor:()=>null,
  stripeClient:()=>null,
}));

import { readCanonicalPricing } from "@/lib/billing/pricing";

describe("canonical billing display fallback",()=>{
  beforeEach(()=>debugLog.mockClear());
  it("keeps approved configured pricing available when Stripe cannot be read",async()=>{
    const pricing=await readCanonicalPricing("free");
    expect(pricing.monthly).toMatchObject({unitAmount:1200,currency:"usd",recurringInterval:"month"});
    expect(pricing.yearly).toMatchObject({unitAmount:12000,currency:"usd",recurringInterval:"year"});
    expect(pricing.savingsPercent).toBe(17);
    expect(debugLog).toHaveBeenCalledWith("general",expect.objectContaining({monthlyPriceConfigured:true,yearlyPriceConfigured:true,stripeReadSucceeded:false,fallbackUsed:true,currentPlan:"free",currency:"usd"}));
  });
});
