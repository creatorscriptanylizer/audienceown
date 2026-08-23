import { PlansBillingWorkspace } from "@/components/plans-billing-workspace";
import { requireCreator, requireViewer } from "@/lib/dal";
import { readBillingRecord } from "@/lib/billing/read";
import { readCanonicalPricing } from "@/lib/billing/pricing";
import { resolveCanonicalBillingState } from "@/lib/billing/interval-switch";
import { getCreatorEntitlements } from "@/lib/provider-entitlements";
import "./plans.css";

export default async function PlansPage({searchParams}:{searchParams:Promise<{checkout?:string}>}){
  const params=await searchParams,checkoutInterval=params.checkout==="monthly"||params.checkout==="yearly"?params.checkout:null;
  const[user,creator]=await Promise.all([requireViewer(),requireCreator()]);
  const[entitlements,billingResult]=await Promise.all([getCreatorEntitlements(creator.id,user),readBillingRecord(creator.id)]);
  const pricing=await readCanonicalPricing(entitlements.plan);
  const billing=billingResult.data;
  const realStatus=billing?.status??entitlements.subscriptionStatus;
  const canonical=await resolveCanonicalBillingState(creator.id).catch(()=>({currentInterval:billing?.billing_interval??null,pendingInterval:null,currentPeriodEnd:billing?.current_period_end??null,pendingEffectiveAt:null}));
  return <PlansBillingWorkspace checkoutInterval={checkoutInterval} canPreviewBilling={entitlements.isAdmin} canManageBilling={Boolean(billing?.stripe_customer_id)} canCancelSubscription={Boolean(billing?.stripe_subscription_id)&&["active","trialing"].includes(realStatus)&&!billing?.cancel_at_period_end} plan={entitlements.plan} subscriptionStatus={realStatus} billingInterval={canonical.currentInterval} pendingInterval={canonical.pendingInterval} periodEnd={canonical.currentPeriodEnd} pendingEffectiveAt={canonical.pendingEffectiveAt} cancelAtPeriodEnd={billing?.cancel_at_period_end??false} hasBillingRelationship={Boolean(billing?.stripe_customer_id)} pricing={pricing}/>;
}
