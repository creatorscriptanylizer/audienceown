const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function productionRuntimeState(environment = process.env.NODE_ENV, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  let supabaseProjectHost = "unconfigured";
  let localSupabaseDetected = false;
  try {
    if (supabaseUrl) {
      const url = new URL(supabaseUrl);
      supabaseProjectHost = url.host;
      localSupabaseDetected = LOOPBACK_HOSTS.has(url.hostname) || url.hostname.endsWith(".localhost");
    }
  } catch {
    supabaseProjectHost = "invalid";
  }
  return {
    environment: environment ?? "unknown",
    nextMode: environment === "production" ? "start" : "dev",
    supabaseProjectHost,
    localSupabaseDetected,
  };
}

export function assertProductionRuntimeSafety(environment = process.env.NODE_ENV, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const state = productionRuntimeState(environment, supabaseUrl);
  if (state.environment === "production" && (state.localSupabaseDetected || state.supabaseProjectHost === "unconfigured" || state.supabaseProjectHost === "invalid")) {
    throw new Error(`[AUDIENCEOWN STARTUP] Refusing production startup with Supabase host: ${state.supabaseProjectHost}`);
  }
  return state;
}
