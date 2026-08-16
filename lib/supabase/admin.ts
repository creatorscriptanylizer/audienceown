import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const SUPABASE_ADMIN_CONFIGURATION_ERROR = "Supabase admin credentials are not configured.";

export class SupabaseAdminConfigurationError extends Error {
  readonly code = "supabase_admin_not_configured";

  constructor() {
    super(SUPABASE_ADMIN_CONFIGURATION_ERROR);
    this.name = "SupabaseAdminConfigurationError";
  }
}

function validAdminKey(value: string | undefined) {
  if (!value) return false;
  if (value.startsWith("sb_secret_") && value.length > "sb_secret_".length) return true;
  const parts = value.split(".");
  return parts.length === 3 && parts.every(Boolean);
}

export function resolveSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const canonicalKey = process.env.SUPABASE_ADMIN_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  let local = false;
  try {
    const hostname = url ? new URL(url).hostname : "";
    local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    throw new SupabaseAdminConfigurationError();
  }
  // Supabase CLI rotates the local sb_secret key when a stack is recreated. Prefer
  // that stack-specific value on loopback so a stale hosted canonical key cannot
  // silently shadow it. Hosted environments retain canonical-key precedence.
  const key = (local
    ? [secretKey, serviceRoleKey, canonicalKey]
    : [canonicalKey, serviceRoleKey, secretKey]
  ).find(validAdminKey);
  const keySource = key === canonicalKey
    ? "canonical" as const
    : key
      ? "legacy_alias" as const
      : "missing" as const;

  if (!url || !key) throw new SupabaseAdminConfigurationError();
  return { url, key, keySource };
}

export function createAdminClient() {
  const { url, key } = resolveSupabaseAdminConfig();

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
