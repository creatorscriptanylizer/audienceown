import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks=vi.hoisted(()=>({billingRecord:vi.fn(),retrieveSubscription:vi.fn(),listSubscriptions:vi.fn(),createSchedule:vi.fn(),updateSchedule:vi.fn(),retrieveSchedule:vi.fn(),releaseSchedule:vi.fn()}));
vi.mock("@/lib/billing/server",()=>({billingRecord:mocks.billingRecord}));
vi.mock("@/lib/billing/stripe",()=>({
  intervalForPrice:(price:string)=>price==="price_monthly"?"monthly":price==="price_yearly"?"yearly":null,
  priceFor:(interval:string)=>interval==="monthly"?"price_monthly":interval==="yearly"?"price_yearly":null,
  stripeClient:()=>({subscriptions:{retrieve:mocks.retrieveSubscription,list:mocks.listSubscriptions},subscriptionSchedules:{create:mocks.createSchedule,update:mocks.updateSchedule,retrieve:mocks.retrieveSchedule,release:mocks.releaseSchedule}}),
}));

import { BillingIntervalSwitchError, cancelBillingIntervalSwitch, resolveCanonicalBillingState, scheduleBillingIntervalSwitch } from "@/lib/billing/interval-switch";

function subscription(interval:"monthly"|"yearly"="monthly",overrides:Record<string,unknown>={}){return{id:"sub_existing",customer:"cus_owned",status:"active",cancel_at_period_end:false,schedule:null,metadata:{creatorId:"creator-1"},items:{data:[{id:"si_existing",price:{id:interval==="monthly"?"price_monthly":"price_yearly"},quantity:1,current_period_start:1_775_000_000,current_period_end:1_777_678_400}]},...overrides};}
function schedule(current:"monthly"|"yearly",target?:"monthly"|"yearly"){const end=1_777_678_400;return{id:"sub_sched_existing",metadata:{audienceown_interval_switch:"true",creatorId:"creator-1",targetInterval:target??""},phases:[{start_date:1_775_000_000,end_date:end,items:[{price:current==="monthly"?"price_monthly":"price_yearly",quantity:1}],discounts:[],metadata:{}},...(target?[{start_date:end,end_date:end+31_536_000,items:[{price:target==="monthly"?"price_monthly":"price_yearly",quantity:1}],discounts:[],metadata:{}}]:[])],current_phase:{start_date:1_775_000_000,end_date:end}};}

describe("billing interval switching",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.billingRecord.mockResolvedValue({stripe_customer_id:"cus_owned",stripe_subscription_id:"sub_existing",billing_interval:"monthly",current_period_end:"2026-05-01T00:00:00.000Z"});mocks.retrieveSubscription.mockResolvedValue(subscription());mocks.listSubscriptions.mockResolvedValue({data:[subscription()]});mocks.createSchedule.mockResolvedValue(schedule("monthly"));mocks.updateSchedule.mockResolvedValue(schedule("monthly","yearly"));mocks.releaseSchedule.mockResolvedValue({status:"released"});});

  it("schedules Monthly to Yearly on the existing subscription boundary without proration",async()=>{const result=await scheduleBillingIntervalSwitch("creator-1","yearly");expect(result).toMatchObject({currentInterval:"monthly",pendingInterval:"yearly"});expect(mocks.createSchedule).toHaveBeenCalledWith({from_subscription:"sub_existing"},expect.any(Object));expect(mocks.updateSchedule).toHaveBeenCalledWith("sub_sched_existing",expect.objectContaining({end_behavior:"release",proration_behavior:"none",metadata:expect.objectContaining({targetInterval:"yearly"}),phases:[expect.objectContaining({end_date:1_777_678_400,proration_behavior:"none",items:[{price:"price_monthly",quantity:1}]}),expect.objectContaining({start_date:1_777_678_400,proration_behavior:"none",items:[{price:"price_yearly",quantity:1}]})]}),expect.any(Object));});

  it("never combines metadata with from_subscription",async()=>{await scheduleBillingIntervalSwitch("creator-1","yearly");const createParams=mocks.createSchedule.mock.calls[0][0];expect(createParams).toEqual({from_subscription:"sub_existing"});expect(createParams).not.toHaveProperty("metadata");});

  it("schedules Yearly to Monthly using the canonical monthly Price",async()=>{mocks.retrieveSubscription.mockResolvedValue(subscription("yearly"));mocks.listSubscriptions.mockResolvedValue({data:[subscription("yearly")]});mocks.createSchedule.mockResolvedValue(schedule("yearly"));mocks.updateSchedule.mockResolvedValue(schedule("yearly","monthly"));await scheduleBillingIntervalSwitch("creator-1","monthly");expect(mocks.updateSchedule).toHaveBeenCalledWith("sub_sched_existing",expect.objectContaining({phases:[expect.objectContaining({items:[{price:"price_yearly",quantity:1}]}),expect.objectContaining({items:[{price:"price_monthly",quantity:1}]})]}),expect.any(Object));});

  it("rejects an already-current interval without creating a schedule",async()=>{await expect(scheduleBillingIntervalSwitch("creator-1","monthly")).rejects.toMatchObject({code:"already_current_interval",status:409});expect(mocks.createSchedule).not.toHaveBeenCalled();});

  it("enforces creator ownership from Stripe metadata",async()=>{mocks.retrieveSubscription.mockResolvedValue(subscription("monthly",{metadata:{creatorId:"creator-2"}}));await expect(scheduleBillingIntervalSwitch("creator-1","yearly")).rejects.toMatchObject({code:"subscription_not_owned",status:403});expect(mocks.createSchedule).not.toHaveBeenCalled();});

  it("rejects multiple active billing relationships",async()=>{mocks.listSubscriptions.mockResolvedValue({data:[subscription(),subscription("yearly",{id:"sub_other"})]});await expect(scheduleBillingIntervalSwitch("creator-1","yearly")).rejects.toMatchObject({code:"ambiguous_subscription",status:409});expect(mocks.createSchedule).not.toHaveBeenCalled();});

  it("does not duplicate an existing pending schedule",async()=>{mocks.retrieveSubscription.mockResolvedValue(subscription("monthly",{schedule:"sub_sched_existing"}));mocks.listSubscriptions.mockResolvedValue({data:[subscription("monthly",{schedule:"sub_sched_existing"})]});mocks.retrieveSchedule.mockResolvedValue(schedule("monthly","yearly"));await expect(scheduleBillingIntervalSwitch("creator-1","yearly")).rejects.toMatchObject({code:"interval_switch_already_pending",status:409});expect(mocks.createSchedule).not.toHaveBeenCalled();});

  it("releases its newly-created schedule when configuration fails safely",async()=>{mocks.updateSchedule.mockRejectedValue(new Error("stripe unavailable"));await expect(scheduleBillingIntervalSwitch("creator-1","yearly")).rejects.toBeInstanceOf(BillingIntervalSwitchError);expect(mocks.releaseSchedule).toHaveBeenCalledWith("sub_sched_existing");});

  it("resolves current and pending intervals from Stripe Price phases",async()=>{mocks.retrieveSubscription.mockResolvedValue(subscription("monthly",{schedule:"sub_sched_existing"}));mocks.retrieveSchedule.mockResolvedValue(schedule("monthly","yearly"));await expect(resolveCanonicalBillingState("creator-1")).resolves.toMatchObject({currentInterval:"monthly",pendingInterval:"yearly",pendingEffectiveAt:expect.any(String)});});

  it("cancels a pending switch by releasing the schedule without canceling the subscription",async()=>{mocks.retrieveSubscription.mockResolvedValue(subscription("monthly",{schedule:"sub_sched_existing"}));mocks.listSubscriptions.mockResolvedValue({data:[subscription("monthly",{schedule:"sub_sched_existing"})]});mocks.retrieveSchedule.mockResolvedValue(schedule("monthly","yearly"));await expect(cancelBillingIntervalSwitch("creator-1")).resolves.toMatchObject({currentInterval:"monthly",pendingInterval:null});expect(mocks.releaseSchedule).toHaveBeenCalledWith("sub_sched_existing",{preserve_cancel_date:true});});
});
