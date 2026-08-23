import { spawn } from "node:child_process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

if (process.env.NODE_ENV !== "production") {
  throw new Error("[AUDIENCEOWN STARTUP] Production launcher requires NODE_ENV=production.");
}

loadEnvConfig(process.cwd(), false);

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let host = "unconfigured";
let localSupabaseDetected = false;
try {
  if (configuredUrl) {
    const parsed = new URL(configuredUrl);
    host = parsed.host;
    localSupabaseDetected = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname) || parsed.hostname.endsWith(".localhost");
  }
} catch {
  host = "invalid";
}

const diagnostic = { environment: process.env.NODE_ENV, nextMode: "start", supabaseProjectHost: host, localSupabaseDetected };
console.info("[AUDIENCEOWN STARTUP]", diagnostic);
if (localSupabaseDetected || host === "unconfigured" || host === "invalid") {
  throw new Error(`[AUDIENCEOWN STARTUP] Refusing production startup with Supabase host: ${host}`);
}
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("[AUDIENCEOWN STARTUP] Refusing production startup without a Supabase publishable key.");
}

const child = spawn(process.execPath, ["./node_modules/next/dist/bin/next", "start"], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exitCode = signal ? 1 : code ?? 1);
