import nextEnv from "@next/env";
import { existsSync, readdirSync, readFileSync } from "node:fs";

nextEnv.loadEnvConfig(process.cwd(), true);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const local = (() => { try { return ["localhost", "127.0.0.1"].includes(new URL(url).hostname); } catch { return false; } })();
const migrations = existsSync("supabase/migrations") ? readdirSync("supabase/migrations") : [];
const stage88 = migrations.some((name) => name.includes("platform_audience_metrics"));
const config = readFileSync("supabase/config.toml", "utf8");
const googleCredentials = Boolean(process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID?.trim() && process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET?.trim());
const googleEnabled = /\[auth\.external\.google\][\s\S]*?enabled\s*=\s*true/.test(config);
const socialEncryptionState = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY === undefined || process.env.SOCIAL_TOKEN_ENCRYPTION_KEY.length === 0
  ? "missing"
  : process.env.SOCIAL_TOKEN_ENCRYPTION_KEY.trim().length === 0 ? "invalid_format" : "configured";

console.log(`Active Supabase project URL: ${url ?? "missing"}`);
console.log(`Local Supabase URL: ${local ? "yes" : "no"}`);
console.log(`Google credentials configured: ${googleCredentials ? "yes" : "no"}`);
console.log(`Google provider enabled: ${googleCredentials && googleEnabled ? "yes" : "no"}`);
console.log(`Social token encryption: ${socialEncryptionState === "invalid_format" ? "INVALID FORMAT" : socialEncryptionState.toUpperCase()}`);
console.log(`Fallback email/password configured: ${config.includes("[auth.email]") ? "yes" : "no"}`);
console.log(`Stage 8.8 migration present: ${stage88 ? "yes" : "no"}`);

if (!local) process.exitCode = 1;
if (local) {
  try {
    const response = await fetch(`${url}/auth/v1/health`, { signal: AbortSignal.timeout(3000) });
    console.log(`Local auth reachable: ${response.ok ? "yes" : "no"}`);
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.log("Local auth reachable: no");
    process.exitCode = 1;
  }
}
if (!stage88) process.exitCode = 1;
if (socialEncryptionState !== "configured") process.exitCode = 1;
