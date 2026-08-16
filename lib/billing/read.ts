import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type BillingRecord = { stripe_customer_id:string;stripe_subscription_id:string|null;billing_interval:"monthly"|"yearly"|null;status:string;current_period_end:string|null;cancel_at_period_end:boolean };
export async function readBillingRecord(creatorId:string){const db=createAdminClient();if(!db)return{data:null as BillingRecord|null,error:new Error("billing_client_unavailable")};const result=await db.from("creator_billing_subscriptions"as never).select("*"as never).eq("creator_id"as never,creatorId).maybeSingle();return{data:result.data as unknown as BillingRecord|null,error:result.error};}
