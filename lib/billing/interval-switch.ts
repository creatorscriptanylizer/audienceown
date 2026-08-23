import "server-only";
import type Stripe from "stripe";
import { billingRecord } from "@/lib/billing/server";
import { intervalForPrice, priceFor, stripeClient, type BillingInterval } from "@/lib/billing/stripe";
import { debugLog } from "@/lib/debug";

const SWITCHABLE_STATUSES = new Set(["active", "trialing"]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);
const SWITCH_METADATA_KEY = "audienceown_interval_switch";

export type CanonicalBillingState = {
  currentInterval: BillingInterval | null;
  pendingInterval: BillingInterval | null;
  currentPeriodEnd: string | null;
  pendingEffectiveAt: string | null;
};

export class BillingIntervalSwitchError extends Error {
  constructor(public code:string,public status:number){super(code);}
}

function id(value:string|{id:string}|null|undefined){return typeof value==="string"?value:value?.id??null;}
function iso(value:number|null|undefined){return value?new Date(value*1000).toISOString():null;}
function stripeFailure(error:unknown){const value=error&&typeof error==="object"?error as{type?:unknown;code?:unknown;statusCode?:unknown}:null;return{stripeErrorType:typeof value?.type==="string"?value.type:"unknown",stripeErrorCode:typeof value?.code==="string"?value.code:null,stripeHttpStatus:typeof value?.statusCode==="number"?value.statusCode:null};}
function subscriptionItem(subscription:Stripe.Subscription){return subscription.items.data.length===1?subscription.items.data[0]:null;}
function pendingFromSchedule(schedule:Stripe.SubscriptionSchedule,currentEnd:number|null|undefined){
  if(schedule.metadata?.[SWITCH_METADATA_KEY]!=="true"||!currentEnd)return null;
  const phase=schedule.phases.find(candidate=>candidate.start_date===currentEnd);
  const priceId=phase?.items.length===1?id(phase.items[0].price):null;
  const interval=priceId?intervalForPrice(priceId):null;
  return interval?{interval,effectiveAt:iso(currentEnd)}:null;
}

async function retrieveSchedule(stripe:Stripe,subscription:Stripe.Subscription){
  const scheduleId=id(subscription.schedule);
  return scheduleId?stripe.subscriptionSchedules.retrieve(scheduleId):null;
}

export async function resolveCanonicalBillingState(creatorId:string):Promise<CanonicalBillingState>{
  const record=await billingRecord(creatorId),stripe=stripeClient();
  if(!record?.stripe_subscription_id||!stripe)return{currentInterval:record?.billing_interval??null,pendingInterval:null,currentPeriodEnd:record?.current_period_end??null,pendingEffectiveAt:null};
  const subscription=await stripe.subscriptions.retrieve(record.stripe_subscription_id),item=subscriptionItem(subscription);
  if(!item||id(subscription.customer)!==record.stripe_customer_id)return{currentInterval:record.billing_interval,pendingInterval:null,currentPeriodEnd:record.current_period_end,pendingEffectiveAt:null};
  const currentInterval=intervalForPrice(item.price.id)??record.billing_interval,currentPeriodEnd=iso(item.current_period_end)??record.current_period_end;
  const schedule=await retrieveSchedule(stripe,subscription),pending=schedule?pendingFromSchedule(schedule,item.current_period_end):null;
  return{currentInterval,pendingInterval:pending?.interval??null,currentPeriodEnd,pendingEffectiveAt:pending?.effectiveAt??null};
}

function phaseItems(phase:Stripe.SubscriptionSchedule.Phase){return phase.items.map(item=>({price:id(item.price)!,quantity:item.quantity??1}));}
function phaseDiscounts(phase:Stripe.SubscriptionSchedule.Phase){return phase.discounts.map(discount=>({discount:id(discount.discount)!})).filter(value=>value.discount);}
function currentPhaseParams(phase:Stripe.SubscriptionSchedule.Phase,endDate:number):Stripe.SubscriptionScheduleUpdateParams.Phase{
  return{items:phaseItems(phase),start_date:phase.start_date,end_date:endDate,proration_behavior:"none",metadata:phase.metadata??undefined,discounts:phaseDiscounts(phase)};
}

async function ownedSwitchableSubscription(creatorId:string){
  const record=await billingRecord(creatorId),stripe=stripeClient();
  if(!stripe||!record?.stripe_customer_id||!record.stripe_subscription_id)throw new BillingIntervalSwitchError("billing_unavailable",404);
  const listed=await stripe.subscriptions.list({customer:record.stripe_customer_id,status:"all",limit:20});
  const active=listed.data.filter(subscription=>ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status));
  if(active.length!==1||active[0].id!==record.stripe_subscription_id)throw new BillingIntervalSwitchError("ambiguous_subscription",409);
  const subscription=await stripe.subscriptions.retrieve(record.stripe_subscription_id);
  if(id(subscription.customer)!==record.stripe_customer_id||subscription.metadata.creatorId!==creatorId)throw new BillingIntervalSwitchError("subscription_not_owned",403);
  if(!SWITCHABLE_STATUSES.has(subscription.status))throw new BillingIntervalSwitchError("subscription_not_switchable",409);
  if(subscription.cancel_at_period_end)throw new BillingIntervalSwitchError("subscription_canceling",409);
  const item=subscriptionItem(subscription),currentInterval=item?intervalForPrice(item.price.id):null;
  if(!item||!currentInterval||!item.current_period_end)throw new BillingIntervalSwitchError("subscription_price_invalid",409);
  return{stripe,subscription,item,currentInterval};
}

export async function scheduleBillingIntervalSwitch(creatorId:string,targetInterval:BillingInterval){
  const{stripe,subscription,item,currentInterval}=await ownedSwitchableSubscription(creatorId);
  if(currentInterval===targetInterval)throw new BillingIntervalSwitchError("already_current_interval",409);
  if(subscription.schedule){const existing=await retrieveSchedule(stripe,subscription);const pending=existing?pendingFromSchedule(existing,item.current_period_end):null;throw new BillingIntervalSwitchError(pending?.interval===targetInterval?"interval_switch_already_pending":"subscription_schedule_conflict",409);}
  const targetPrice=priceFor(targetInterval);if(!targetPrice)throw new BillingIntervalSwitchError("billing_not_configured",503);
  let schedule:Stripe.SubscriptionSchedule;
  try{schedule=await stripe.subscriptionSchedules.create({from_subscription:subscription.id},{idempotencyKey:`interval-schedule-${subscription.id}-${targetInterval}-${item.current_period_end}`});}
  catch(error){debugLog("general",{event:"billing_interval_switch_failed",stage:"subscription_schedule_create",targetInterval,currentInterval,subscriptionStatus:subscription.status,hasSubscription:true,hasSchedule:Boolean(subscription.schedule),subscriptionItemCount:subscription.items.data.length,periodEndPresent:Boolean(item.current_period_end),scheduleCreated:false,scheduleUpdated:false,...stripeFailure(error)});throw new BillingIntervalSwitchError("stripe_schedule_failed",502);}
  try{
    const current=schedule.phases.find(phase=>phase.start_date<=item.current_period_end&&phase.end_date>=item.current_period_end)??schedule.phases.at(-1);
    if(!current)throw new Error("missing_current_phase");
    const updated=await stripe.subscriptionSchedules.update(schedule.id,{end_behavior:"release",proration_behavior:"none",metadata:{[SWITCH_METADATA_KEY]:"true",creatorId,targetInterval},phases:[currentPhaseParams(current,item.current_period_end),{items:[{price:targetPrice,quantity:item.quantity??1}],start_date:item.current_period_end,proration_behavior:"none",discounts:phaseDiscounts(current),metadata:{creatorId,billingInterval:targetInterval}}]},{idempotencyKey:`interval-switch-${subscription.id}-${targetInterval}-${item.current_period_end}`});
    const pending=pendingFromSchedule(updated,item.current_period_end);
    if(!pending||pending.interval!==targetInterval)throw new Error("schedule_not_confirmed");
    return{currentInterval,pendingInterval:pending.interval,effectiveAt:pending.effectiveAt};
  }catch(error){let scheduleReleased=false;try{await stripe.subscriptionSchedules.release(schedule.id);scheduleReleased=true;}catch{}debugLog("general",{event:"billing_interval_switch_failed",stage:"subscription_schedule_update",targetInterval,currentInterval,subscriptionStatus:subscription.status,hasSubscription:true,hasSchedule:true,subscriptionItemCount:subscription.items.data.length,periodEndPresent:Boolean(item.current_period_end),scheduleCreated:true,scheduleUpdated:false,scheduleReleased,...stripeFailure(error)});if(error instanceof BillingIntervalSwitchError)throw error;throw new BillingIntervalSwitchError("stripe_schedule_failed",502);}
}

export async function cancelBillingIntervalSwitch(creatorId:string){
  const{stripe,subscription,item,currentInterval}=await ownedSwitchableSubscription(creatorId),schedule=await retrieveSchedule(stripe,subscription);
  if(!schedule||!pendingFromSchedule(schedule,item.current_period_end))throw new BillingIntervalSwitchError("no_pending_interval_switch",409);
  try{await stripe.subscriptionSchedules.release(schedule.id,{preserve_cancel_date:true});return{currentInterval,pendingInterval:null,effectiveAt:null};}
  catch{throw new BillingIntervalSwitchError("stripe_schedule_release_failed",502);}
}
