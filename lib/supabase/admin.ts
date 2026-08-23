import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const SUPABASE_ADMIN_CONFIGURATION_ERROR = "Supabase admin credentials are not configured.";
export const SUPABASE_ADMIN_ENVIRONMENT_MISMATCH_ERROR = "supabase_admin_environment_mismatch";

export class SupabaseAdminConfigurationError extends Error {
  readonly code = "supabase_admin_not_configured";

  constructor() {
    super(SUPABASE_ADMIN_CONFIGURATION_ERROR);
    this.name = "SupabaseAdminConfigurationError";
  }
}

export class SupabaseAdminEnvironmentMismatchError extends Error {
  readonly code = SUPABASE_ADMIN_ENVIRONMENT_MISMATCH_ERROR;

  constructor() {
    super(SUPABASE_ADMIN_ENVIRONMENT_MISMATCH_ERROR);
    this.name = "SupabaseAdminEnvironmentMismatchError";
  }
}

function validAdminKey(value: string | undefined) {
  if (!value) return false;
  if (value.startsWith("sb_secret_") && value.length > "sb_secret_".length) return true;
  const parts = value.split(".");
  return parts.length === 3 && parts.every(Boolean);
}

type SafeJwtClaims = { role?:unknown; ref?:unknown; iss?:unknown };

function safeJwtClaims(value:string):SafeJwtClaims|null {
  const parts=value.split(".");
  if(parts.length!==3)return null;
  try {
    return JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8")) as SafeJwtClaims;
  } catch {
    return null;
  }
}

function loopbackUrl(url:string) {
  const hostname=new URL(url).hostname;
  return hostname==="localhost"||hostname==="127.0.0.1"||hostname==="::1";
}

function hostedProjectRef(url:string) {
  const hostname=new URL(url).hostname;
  return hostname.endsWith(".supabase.co")?hostname.slice(0,-".supabase.co".length):null;
}

function keyEnvironmentMismatch(url:string,key:string) {
  const claims=safeJwtClaims(key);
  if(!claims)return false;
  const ref=typeof claims.ref==="string"?claims.ref:null;
  let issuerHost:string|null=null;
  if(typeof claims.iss==="string") {
    try { issuerHost=new URL(claims.iss).hostname; } catch { /* Non-URL local issuers are valid. */ }
  }
  if(loopbackUrl(url))return Boolean(ref||issuerHost?.endsWith(".supabase.co"));
  const expectedRef=hostedProjectRef(url);
  return Boolean(expectedRef&&ref&&ref!==expectedRef);
}

export function resolveSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const canonicalKey = process.env.SUPABASE_ADMIN_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  try {
    if(url)new URL(url);
  } catch {
    throw new SupabaseAdminConfigurationError();
  }
  const key = [canonicalKey, serviceRoleKey, secretKey].find(validAdminKey);
  const keySource = key === canonicalKey
    ? "canonical" as const
    : key
      ? "legacy_alias" as const
      : "missing" as const;

  if (!url || !key) throw new SupabaseAdminConfigurationError();
  if(keyEnvironmentMismatch(url,key))throw new SupabaseAdminEnvironmentMismatchError();
  const configuredKeys=[canonicalKey,serviceRoleKey,secretKey].filter(validAdminKey) as string[];
  const conflictingAdminCredentials=new Set(configuredKeys).size>1;
  return { url, key, keySource, conflictingAdminCredentials };
}

export function createAdminClient() {
  const { url, key } = resolveSupabaseAdminConfig();

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
