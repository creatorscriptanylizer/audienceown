import "server-only";
import { debugLog } from "@/lib/debug";
import { canonicalProDisplayPrices, priceFor, stripeClient, type BillingInterval } from "@/lib/billing/stripe";

export type CanonicalPrice={interval:BillingInterval;unitAmount:number;currency:string;recurringInterval:"month"|"year"};
export type CanonicalPricing={monthly:CanonicalPrice;yearly:CanonicalPrice;savingsPercent:number|null};

function savingsPercent(monthly:CanonicalPrice,yearly:CanonicalPrice){
  if(monthly.currency!==yearly.currency)return null;
  const annualMonthly=monthly.unitAmount*12;
  return yearly.unitAmount<annualMonthly?Math.round((1-yearly.unitAmount/annualMonthly)*100):null;
}

export function configuredCanonicalPricing():CanonicalPricing{
  const monthly={...canonicalProDisplayPrices.monthly};
  const yearly={...canonicalProDisplayPrices.yearly};
  return{monthly,yearly,savingsPercent:savingsPercent(monthly,yearly)};
}

export async function readCanonicalPricing(currentPlan:"free"|"pro"="free"):Promise<CanonicalPricing>{
  const stripe=stripeClient(),monthlyId=priceFor("monthly"),yearlyId=priceFor("yearly");
  const fallback=configuredCanonicalPricing();
  let result=fallback,stripeReadSucceeded=false;
  try{
    if(!stripe||!monthlyId||!yearlyId)throw new Error("stripe_price_read_not_configured");
    const[monthlyPrice,yearlyPrice]=await Promise.all([stripe.prices.retrieve(monthlyId),stripe.prices.retrieve(yearlyId)]);
    if(monthlyPrice.unit_amount===null||yearlyPrice.unit_amount===null||!monthlyPrice.recurring||!yearlyPrice.recurring||monthlyPrice.currency!==yearlyPrice.currency)throw new Error("stripe_price_read_incomplete");
    if(monthlyPrice.recurring.interval!=="month"||yearlyPrice.recurring.interval!=="year")throw new Error("stripe_price_cadence_invalid");
    const monthly:CanonicalPrice={interval:"monthly",unitAmount:monthlyPrice.unit_amount,currency:monthlyPrice.currency,recurringInterval:"month"};
    const yearly:CanonicalPrice={interval:"yearly",unitAmount:yearlyPrice.unit_amount,currency:yearlyPrice.currency,recurringInterval:"year"};
    result={monthly,yearly,savingsPercent:savingsPercent(monthly,yearly)};
    stripeReadSucceeded=true;
  }catch{}
  debugLog("general",{event:"billing_pricing_read",billingInterval:"monthly/yearly",monthlyPriceConfigured:Boolean(fallback.monthly),yearlyPriceConfigured:Boolean(fallback.yearly),stripeReadSucceeded,fallbackUsed:!stripeReadSucceeded,currentPlan,currency:result.monthly.currency});
  return result;
}
