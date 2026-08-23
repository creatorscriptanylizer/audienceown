import { apiUnavailable } from "@/lib/api-unavailable";
import { billingRecord } from "@/lib/billing/server";
import { getCreator } from "@/lib/dal";
import { getCreatorEntitlements } from "@/lib/provider-entitlements";
import { resolveCanonicalBillingState } from "@/lib/billing/interval-switch";

export async function GET(){const creator=await getCreator();if(!creator)return Response.json({error:"unauthorized"},{status:401});try{const[e,b,canonical]=await Promise.all([getCreatorEntitlements(creator.id),billingRecord(creator.id),resolveCanonicalBillingState(creator.id)]);return Response.json({plan:e.plan,status:b?.status??"inactive",billingInterval:canonical.currentInterval,pendingInterval:canonical.pendingInterval,currentPeriodEnd:canonical.currentPeriodEnd,pendingEffectiveAt:canonical.pendingEffectiveAt,cancelAtPeriodEnd:b?.cancel_at_period_end??false},{headers:{"cache-control":"private, no-store"}});}catch(error){return apiUnavailable("billing_status","billing_or_entitlements",error);}}
