import { apiUnavailable } from "@/lib/api-unavailable";
import { billingRecord } from "@/lib/billing/server";
import { getCreator } from "@/lib/dal";
import { getCreatorEntitlements } from "@/lib/provider-entitlements";

export async function GET(){const creator=await getCreator();if(!creator)return Response.json({error:"unauthorized"},{status:401});try{const[e,b]=await Promise.all([getCreatorEntitlements(creator.id),billingRecord(creator.id)]);return Response.json({plan:e.plan,status:b?.status??"inactive",billingInterval:b?.billing_interval??null,currentPeriodEnd:b?.current_period_end??null,cancelAtPeriodEnd:b?.cancel_at_period_end??false},{headers:{"cache-control":"private, no-store"}});}catch(error){return apiUnavailable("billing_status","billing_or_entitlements",error);}}
