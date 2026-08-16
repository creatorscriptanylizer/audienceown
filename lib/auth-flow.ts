export const LOCAL_GOOGLE_UNAVAILABLE = "Google sign-in is not configured for this local environment.";

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "http://local.invalid");
    return parsed.origin === "http://local.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export function isLocalSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

type AuthEnvironment = Record<string, string | undefined>;

export function localGoogleConfigured(env: AuthEnvironment = process.env) {
  return Boolean(env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID?.trim() && env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET?.trim());
}

export function shouldOfferGoogle(env: AuthEnvironment = process.env) {
  return !isLocalSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) || localGoogleConfigured(env);
}

export function mapOAuthError(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return text.includes("provider") && (text.includes("not enabled") || text.includes("unsupported"))
    ? "google_not_configured"
    : "oauth";
}
