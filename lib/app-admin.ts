import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { debugError, debugLog } from "@/lib/debug";

type AuthenticatedUser = Pick<User, "id" | "email">;
type AdminRpcError = { code?:unknown; message?:unknown; status?:unknown; httpStatus?:unknown };

const PROVISION_RPC = "provision_configured_app_admin";

export function adminProvisionErrorCategory(error:AdminRpcError) {
  const code=typeof error.code==="string"?error.code:"";
  const message=typeof error.message==="string"?error.message.toLowerCase():"";
  if(code==="PGRST202"||code==="42883")return "rpc_or_function_missing";
  if(code==="42501")return message.includes("row-level security")?"rls_rejection":"permission_denied";
  if(code==="22P02"||code==="22023"||code==="PGRST100"||code==="PGRST102")return "malformed_rpc_arguments";
  if(code==="23505")return "existing_row_conflict";
  if(code==="23502"||code==="23503"||code==="23514")return "app_admins_insertion_failure";
  if(code==="42P01"||code==="42703"||code==="42P13"||code==="PGRST204"||code==="PGRST205")return "database_schema_mismatch";
  return "unexpected_supabase_postgrest_error";
}

function rpcDiagnostic(error:AdminRpcError) {
  const status=typeof error.httpStatus==="number"?error.httpStatus:typeof error.status==="number"?error.status:null;
  return {
    operation:"provision_app_admin",
    rpcName:PROVISION_RPC,
    category:adminProvisionErrorCategory(error),
    code:typeof error.code==="string"?error.code:null,
    httpStatus:status,
  };
}

export function configuredAdminEmails(value = process.env.AUDIENCEOWN_ADMIN_EMAILS) {
  return new Set((value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isConfiguredAdminEmail(email:string|null|undefined,value = process.env.AUDIENCEOWN_ADMIN_EMAILS) {
  const normalized=email?.trim().toLowerCase();
  return Boolean(normalized&&configuredAdminEmails(value).has(normalized));
}

export async function isAppAdmin(userId:string) {
  try {
    const db=createAdminClient();
    const result=await db.rpc("is_app_admin" as never,{p_user_id:userId} as never);
    if(result.error) {
      debugError("general",result.error,{event:"admin_database_role_check_failed",operation:"resolve_app_admin",rpcName:"is_app_admin",category:adminProvisionErrorCategory(result.error)});
      return false;
    }
    const admin=result.data===true;
    debugLog("general",{event:"admin_database_role_present",present:admin});
    return admin;
  } catch(error) {
    debugError("general",error,{event:"admin_database_role_check_failed",operation:"create_admin_client",category:"service_role_configuration_failure"});
    return false;
  }
}

/** Canonical server-only admin resolver. Browser flags and metadata are never consulted. */
export async function isAdminUser(user:AuthenticatedUser|null|undefined) {
  if(!user?.id||!user.email)return false;
  const configured=configuredAdminEmails().size>0;
  const allowlisted=isConfiguredAdminEmail(user.email);
  debugLog("general",{event:"admin_allowlist_configured",configured});
  debugLog("general",{event:"admin_email_allowlisted",allowlisted});
  if(allowlisted) {
    try {
      const db=createAdminClient();
      debugLog("general",{event:"admin_provision_attempted",operation:"provision_app_admin",rpcName:PROVISION_RPC});
      const provisioned=await db.rpc(PROVISION_RPC as never,{p_user_id:user.id,p_display_email:user.email.trim().toLowerCase()} as never);
      if(provisioned.error) {
        debugError("general",provisioned.error,{event:"admin_provision_failed",...rpcDiagnostic(provisioned.error)});
        return false;
      }
      debugLog("general",{event:"admin_provision_succeeded",operation:"provision_app_admin",rpcName:PROVISION_RPC});
      const present=await isAppAdmin(user.id);
      debugLog("general",{event:"admin_entitlement_resolved",isAdmin:present,source:present?"database":"none"});
      return present;
    } catch(error) {
      debugError("general",error,{event:"admin_provision_failed",operation:"create_admin_client",rpcName:PROVISION_RPC,category:"service_role_configuration_failure"});
      return false;
    }
  }
  const present=await isAppAdmin(user.id);
  debugLog("general",{event:"admin_entitlement_resolved",isAdmin:present,source:present?"database":"none"});
  return present;
}
