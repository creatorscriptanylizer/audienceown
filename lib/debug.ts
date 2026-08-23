import "server-only";

import { randomBytes } from "node:crypto";

export type DebugArea = "oauth" | "database" | "providers" | "sync" | "general";
export type DebugMetadata = Record<string, unknown>;

const SENSITIVE_KEY = /(access_?token|refresh_?token|token_?ciphertext|authorization|cookie|password|secret|api_?key|apikey|service_?role|anon_?key|encryption_?key|code_?verifier|client_?secret|authorization_?code|signed_?state|jwt)/i;
function enabled(area: DebugArea) {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.AUDIENCEOWN_DEBUG === "true" || process.env.AUDIENCEOWN_DEBUG === "1") return true;
  const flags: Partial<Record<DebugArea, string>> = { oauth: "DEBUG_OAUTH", database: "DEBUG_DATABASE", providers: "DEBUG_PROVIDERS", sync: "DEBUG_SYNC" };
  const flag = flags[area];
  return Boolean(flag && process.env[flag] === "true");
}

function sanitizeValue(key: string, value: unknown, depth = 0): unknown {
  if (value === "configured" || value === "missing" || value === "invalid_format") return value;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (/^Bearer\s+/i.test(value) || value.split(".").length === 3 && value.length > 80) return "[REDACTED]";
    return value.length > 2_000 ? `${value.slice(0, 2_000)}…` : value;
  }
  if (depth >= 5) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitizeValue(key, item, depth + 1));
  if (typeof value === "object") {
    const output: DebugMetadata = {};
    for (const [childKey, childValue] of Object.entries(value as DebugMetadata)) {
      output[childKey] = sanitizeValue(childKey, childValue, depth + 1);
    }
    return output;
  }
  return String(value);
}

export function sanitizeDebugMetadata(metadata: DebugMetadata = {}) {
  return sanitizeValue("metadata", metadata) as DebugMetadata;
}

export function serializeDebugError(error: unknown): DebugMetadata {
  if (!error || typeof error !== "object") return { errorType: typeof error, message: typeof error === "string" ? error : "Unknown error" };
  const source = error as DebugMetadata;
  const result: DebugMetadata = {
    errorType: typeof source.name === "string" ? source.name : error.constructor?.name ?? "UnknownError",
  };
  for (const key of ["code", "message", "details", "hint", "provider", "providerCode", "category", "httpStatus", "status"] as const) {
    if (typeof source[key] === "string" || typeof source[key] === "number") result[key] = sanitizeValue(key, source[key]);
  }
  if (error instanceof Error) {
    result.name = error.name;
    result.message = sanitizeValue("message", error.message);
    if (process.env.NODE_ENV !== "production" && error.stack) result.stack = sanitizeValue("stack", error.stack);
  }
  if (Array.isArray(source.issues)) {
    result.issues = source.issues.slice(0, 25).map((issue) => {
      const item = issue && typeof issue === "object" ? issue as DebugMetadata : {};
      return { path: Array.isArray(item.path) ? item.path.map(String) : [], code: item.code, message: item.message };
    });
  }
  return sanitizeDebugMetadata(result);
}

function emit(label: string, level: "info" | "error", area: DebugArea, metadata: DebugMetadata) {
  if (!enabled(area)) return;
  console[level](label, sanitizeDebugMetadata(metadata));
}

export function debugLog(area: DebugArea, metadata: DebugMetadata) { emit("[AUDIENCEOWN DEBUG]", "info", area, { area, ...metadata }); }
export function debugError(area: DebugArea, error: unknown, metadata: DebugMetadata = {}) {
  emit("[AUDIENCEOWN DEBUG]", "error", area, { area, status: "FAILED", ...metadata, ...serializeDebugError(error) });
}
export function debugDatabaseError(operation: string, table: string, error: unknown, metadata: DebugMetadata = {}) {
  emit("[AUDIENCEOWN DB]", "error", "database", { operation, table, status: "FAILED", ...metadata, ...serializeDebugError(error) });
}

export function debugEmailVerification(metadata: DebugMetadata) {
  emit("[AUDIENCEOWN EMAIL VERIFY]", "info", "general", metadata);
}

export function recoveryMemberDebugEnabled() {
  return process.env.AUDIENCEOWN_DEBUG === "true" || process.env.AUDIENCEOWN_DEBUG === "1";
}

export function debugRecoveryMember(metadata: DebugMetadata) {
  if (!recoveryMemberDebugEnabled()) return;
  console.info("[AUDIENCEOWN RECOVERY MEMBER]", metadata);
}

export function debugStep(area: DebugArea, step: string, metadata: DebugMetadata = {}) {
  const started = performance.now();
  debugLog(area, { ...metadata, step, status: "STARTED" });
  return {
    success(extra: DebugMetadata = {}) { debugLog(area, { ...metadata, ...extra, step, status: "SUCCESS", duration_ms: Math.round(performance.now() - started) }); },
    failed(error: unknown, extra: DebugMetadata = {}) { debugError(area, error, { ...metadata, ...extra, step, duration_ms: Math.round(performance.now() - started) }); },
  };
}

export function createTraceId(prefix = "dbg") { return `${prefix}_${randomBytes(3).toString("hex")}`; }

function configState(value: string | undefined, validate?: (value: string) => boolean) {
  if (!value) return "missing";
  return validate && !validate(value) ? "invalid_format" : "configured";
}

const startupKey = Symbol.for("audienceown.debug.startup");
export function reportDevelopmentConfiguration() {
  const shared = globalThis as unknown as Record<PropertyKey, unknown>;
  if (!enabled("general") || shared[startupKey]) return;
  shared[startupKey] = true;
  const canonicalAdminKey = process.env.SUPABASE_ADMIN_KEY;
  const legacyAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  emit("[AUDIENCEOWN CONFIG]", "info", "general", {
    SUPABASE_URL: configState(process.env.NEXT_PUBLIC_SUPABASE_URL, (value) => { try { return Boolean(new URL(value)); } catch { return false; } }),
    SUPABASE_ADMIN_KEY: configState(canonicalAdminKey || legacyAdminKey),
    ...(canonicalAdminKey || !legacyAdminKey ? {} : { admin_key_source: "legacy_alias" }),
  });
}

reportDevelopmentConfiguration();
