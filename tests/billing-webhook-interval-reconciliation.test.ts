import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const rpc=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({rpc})}));
vi.mock("@/lib/debug",()=>({debugLog:vi.fn()}));
vi.mock("@/lib/billing/stripe",()=>({intervalForPrice:(price:string)=>price==="price_monthly"?"monthly":price==="price_yearly"?"yearly":null,unix:(value:number|null|undefined)=>value?new Date(value*1000).toISOString():null}));
import { syncStripeSubscription } from "@/lib/billing/server";

function event(id:string,created:number):Stripe.Event{return{id,type:"customer.subscription.updated",created} as Stripe.Event;}
function subscription(interval:"monthly"|"yearly",schedule:string|null=null):Stripe.Subscription{return{id:"sub_existing",customer:"cus_existing",status:"active",cancel_at_period_end:false,cancel_at:null,trial_end:null,schedule,metadata:{creatorId:"creator-1"},items:{data:[{price:{id:interval==="monthly"?"price_monthly":"price_yearly"},current_period_start:1_775_000_000,current_period_end:1_777_678_400}]}} as unknown as Stripe.Subscription;}

describe("subscription.updated interval reconciliation",()=>{beforeEach(()=>{rpc.mockReset();rpc.mockResolvedValue({data:true,error:null});});
  it("keeps Monthly canonical while a Yearly schedule is pending and preserves Pro status",async()=>{await syncStripeSubscription(event("evt_pending",1),subscription("monthly","sub_sched_pending"));expect(rpc).toHaveBeenCalledWith("apply_stripe_subscription_event",expect.objectContaining({p_interval:"monthly",p_price_id:"price_monthly",p_status:"active"}));});
  it("reconciles the completed Monthly to Yearly phase transition",async()=>{await syncStripeSubscription(event("evt_yearly",2),subscription("yearly"));expect(rpc).toHaveBeenCalledWith("apply_stripe_subscription_event",expect.objectContaining({p_interval:"yearly",p_price_id:"price_yearly",p_status:"active"}));});
  it("reconciles the completed Yearly to Monthly phase transition",async()=>{await syncStripeSubscription(event("evt_monthly",3),subscription("monthly"));expect(rpc).toHaveBeenCalledWith("apply_stripe_subscription_event",expect.objectContaining({p_interval:"monthly",p_price_id:"price_monthly",p_status:"active"}));});
});
