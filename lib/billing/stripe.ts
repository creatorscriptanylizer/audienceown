import "server-only";
import Stripe from "stripe";
import {z}from"zod";
const schema=z.object({STRIPE_SECRET_KEY:z.string().startsWith("sk_"),STRIPE_WEBHOOK_SECRET:z.string().startsWith("whsec_"),STRIPE_PRO_MONTHLY_PRICE_ID:z.string().startsWith("price_"),STRIPE_PRO_YEARLY_PRICE_ID:z.string().startsWith("price_")});
export type BillingInterval="monthly"|"yearly";
export function stripeConfiguration(){const parsed=schema.safeParse(process.env);return parsed.success?parsed.data:null;}
export function stripeClient(){const config=stripeConfiguration();return config?new Stripe(config.STRIPE_SECRET_KEY):null;}
export function priceFor(interval:BillingInterval){const c=stripeConfiguration();return c?(interval==="monthly"?c.STRIPE_PRO_MONTHLY_PRICE_ID:c.STRIPE_PRO_YEARLY_PRICE_ID):null;}
export function intervalForPrice(price:string){const c=stripeConfiguration();return c&&price===c.STRIPE_PRO_MONTHLY_PRICE_ID?"monthly"as const:c&&price===c.STRIPE_PRO_YEARLY_PRICE_ID?"yearly"as const:null;}
export function unix(value:number|null|undefined){return value?new Date(value*1000).toISOString():null;}
