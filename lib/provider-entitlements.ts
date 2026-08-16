import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { debugLog } from "@/lib/debug";
import { isAdminUser } from "@/lib/app-admin";
import type { User } from "@supabase/supabase-js";

export type ProviderConnectionRole = "official" | "backup";
export type CreatorEntitlements = {
  isAdmin: boolean;
  plan: "free" | "pro";
  subscriptionStatus: "inactive" | "trialing" | "active" | "past_due" | "unpaid" | "incomplete" | "canceled";
  providerConnections: {
    official: { currentCount:number; limit:1|null; allowed:boolean };
    backup: { currentCount:number; limit:1|null; allowed:boolean };
  };
};

type RawEntitlement = { plan?:unknown; subscriptionStatus?:unknown; currentCount?:unknown; limit?:unknown; allowed?:unknown; qaOverride?:unknown };
type ProviderEntitlementRpcError = { code?:unknown; message?:unknown; details?:unknown; hint?:unknown };
const statuses = new Set(["inactive", "trialing", "active", "past_due", "unpaid", "incomplete", "canceled"]);

export class ProviderEntitlementError extends Error {
  readonly code = "entitlements_unavailable";

  constructor() {
    super("entitlements_unavailable");
    this.name = "ProviderEntitlementError";
  }
}

function safeErrorField(value:unknown) {
  return typeof value === "string" ? value : null;
}

function logRpcError(role:ProviderConnectionRole, creatorId:string, error:ProviderEntitlementRpcError) {
  if(process.env.NODE_ENV !== "development" || process.env.AUDIENCEOWN_DEBUG !== "1")return;
  console.error("provider_entitlement_rpc_error",{
    role,
    creatorId,
    rpcName:"get_provider_connection_entitlement",
    code:safeErrorField(error.code),
    message:safeErrorField(error.message),
    details:safeErrorField(error.details),
    hint:safeErrorField(error.hint),
  });
}

function normalized(raw:RawEntitlement|null, role:ProviderConnectionRole) {
  const plan=raw?.plan==="pro"?"pro" as const:"free" as const;
  const status=typeof raw?.subscriptionStatus==="string"&&statuses.has(raw.subscriptionStatus)?raw.subscriptionStatus as CreatorEntitlements["subscriptionStatus"]:"inactive";
  const currentCount=typeof raw?.currentCount==="number"?raw.currentCount:0;
  const limit:1|null=plan==="pro"?null:1;
  return {role,plan,status,currentCount,limit,allowed:limit===null||currentCount<limit};
}

export async function getCreatorEntitlements(creatorId:string,user?:Pick<User,"id"|"email">|null):Promise<CreatorEntitlements> {
  const admin=user?await isAdminUser(user):false;
  const db=createAdminClient();
  const [officialResult,backupResult]=await Promise.all([
    db.rpc("get_provider_connection_entitlement" as never,{p_creator_id:creatorId,p_role:"official"} as never),
    db.rpc("get_provider_connection_entitlement" as never,{p_creator_id:creatorId,p_role:"backup"} as never),
  ]);
  if(officialResult.error)logRpcError("official",creatorId,officialResult.error);
  if(backupResult.error)logRpcError("backup",creatorId,backupResult.error);
  if(officialResult.error||backupResult.error)throw new ProviderEntitlementError();
  const official=normalized(officialResult.data as RawEntitlement|null,"official");
  const backup=normalized(backupResult.data as RawEntitlement|null,"backup");
  const plan=official.plan==="pro"&&backup.plan==="pro"?"pro" as const:"free" as const;
  debugLog("providers",{event:"qa_entitlement_resolved",creatorId,qaOverride:(officialResult.data as RawEntitlement|null)?.qaOverride===true,resolvedPlan:plan});
  const officialSlot=admin?{currentCount:official.currentCount,limit:null,allowed:true}:official;
  const backupSlot=admin?{currentCount:backup.currentCount,limit:null,allowed:true}:backup;
  debugLog("providers",{event:"admin_entitlement_resolved",isAdmin:admin,plan,officialLimit:officialSlot.limit,backupLimit:backupSlot.limit});
  return {isAdmin:admin,plan,subscriptionStatus:official.status,providerConnections:{official:{currentCount:officialSlot.currentCount,limit:officialSlot.limit,allowed:officialSlot.allowed},backup:{currentCount:backupSlot.currentCount,limit:backupSlot.limit,allowed:backupSlot.allowed}}};
}

export async function canCreateProviderConnection(creatorId:string,role:ProviderConnectionRole,operation:"new_connection"|"reconnect"="new_connection",user?:Pick<User,"id"|"email">|null) {
  const entitlements=await getCreatorEntitlements(creatorId,user),slot=entitlements.providerConnections[role];
  const allowed=operation==="reconnect"||slot.allowed;
  debugLog("providers",{event:"provider_entitlement_check",creatorId,role,plan:entitlements.plan,isAdmin:entitlements.isAdmin,currentCount:slot.currentCount,limit:slot.limit,allowed,operation});
  return {...slot,plan:entitlements.plan,allowed};
}

export function isConnectionLimitError(error:unknown) {
  if(!error||typeof error!=="object")return false;
  const value=error as {code?:unknown;message?:unknown;details?:unknown};
  return value.code==="P0001"&&(value.message==="connection_limit_reached"||value.details==="connection_limit_reached");
}
