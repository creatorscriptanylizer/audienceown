import "server-only";
import Stripe from "stripe";
import {z}from"zod";
const schema=z.object({STRIPE_SECRET_KEY:z.string().regex(/^sk_(test|live)_/),STRIPE_WEBHOOK_SECRET:z.string().startsWith("whsec_"),STRIPE_PRO_MONTHLY_PRICE_ID:z.string().startsWith("price_"),STRIPE_PRO_YEARLY_PRICE_ID:z.string().startsWith("price_")});
export type BillingInterval="monthly"|"yearly";
export type StripeMode="test"|"live";
export const canonicalProDisplayPrices={
  monthly:{interval:"monthly",unitAmount:1200,currency:"usd",recurringInterval:"month"},
  yearly:{interval:"yearly",unitAmount:12000,currency:"usd",recurringInterval:"year"},
}as const;
export function stripeConfiguration(){const parsed=schema.safeParse(process.env);return parsed.success?parsed.data:null;}
export function stripeClient(){const config=stripeConfiguration();return config?new Stripe(config.STRIPE_SECRET_KEY):null;}
export function priceFor(interval:BillingInterval){const c=stripeConfiguration();return c?(interval==="monthly"?c.STRIPE_PRO_MONTHLY_PRICE_ID:c.STRIPE_PRO_YEARLY_PRICE_ID):null;}
export function intervalForPrice(price:string){const c=stripeConfiguration();return c&&price===c.STRIPE_PRO_MONTHLY_PRICE_ID?"monthly"as const:c&&price===c.STRIPE_PRO_YEARLY_PRICE_ID?"yearly"as const:null;}
export function stripeMode(secret:string):StripeMode{return secret.startsWith("sk_test_")?"test":"live";}
export async function validateStripePrices(stripe:Stripe,config:z.infer<typeof schema>){
  const mode=stripeMode(config.STRIPE_SECRET_KEY),expectedLive=mode==="live";
  const[monthly,yearly]=await Promise.all([stripe.prices.retrieve(config.STRIPE_PRO_MONTHLY_PRICE_ID),stripe.prices.retrieve(config.STRIPE_PRO_YEARLY_PRICE_ID)]);
  const productId=(price:Stripe.Price)=>typeof price.product==="string"?price.product:price.product.id;
  const monthlyValid=monthly.active&&monthly.livemode===expectedLive&&monthly.currency==="usd"&&monthly.unit_amount===canonicalProDisplayPrices.monthly.unitAmount&&monthly.recurring?.interval==="month";
  const yearlyValid=yearly.active&&yearly.livemode===expectedLive&&yearly.currency==="usd"&&yearly.unit_amount===canonicalProDisplayPrices.yearly.unitAmount&&yearly.recurring?.interval==="year";
  return{valid:monthlyValid&&yearlyValid&&productId(monthly)===productId(yearly),mode,monthlyValid,yearlyValid};
}
export function unix(value:number|null|undefined){return value?new Date(value*1000).toISOString():null;}
