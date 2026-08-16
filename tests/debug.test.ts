import { afterEach, describe, expect, it, vi } from "vitest";
import { debugError, debugLog, reportDevelopmentConfiguration, sanitizeDebugMetadata, serializeDebugError } from "@/lib/debug";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("development diagnostics", () => {
  it("redacts secret-shaped fields recursively", () => {
    expect(sanitizeDebugMetadata({ access_token:"plain", nested:{ clientSecret:"hidden", connectionId:"safe" } })).toEqual({
      access_token:"[REDACTED]", nested:{ clientSecret:"[REDACTED]", connectionId:"safe" },
    });
  });

  it("preserves safe configuration states without exposing secret values", () => {
    expect(sanitizeDebugMetadata({
      SOCIAL_TOKEN_ENCRYPTION_KEY:"configured",
      another_encryption_key:"actual-secret",
    })).toEqual({ SOCIAL_TOKEN_ENCRYPTION_KEY:"configured", another_encryption_key:"[REDACTED]" });
  });

  it("allowlists useful database and validation error fields", () => {
    expect(serializeDebugError({ name:"PostgrestError", code:"23503", message:"foreign key", details:"safe detail", hint:"safe hint", payload:"ignored" })).toEqual(expect.objectContaining({
      errorType:"PostgrestError", code:"23503", message:"foreign key", details:"safe detail", hint:"safe hint",
    }));
    expect(serializeDebugError({ name:"ZodError", issues:[{ path:["profile","name"], code:"too_small", message:"Required", input:"private" }] })).toEqual(expect.objectContaining({
      issues:[{ path:["profile","name"], code:"too_small", message:"Required" }],
    }));
  });

  it("is silent in production even when flags are enabled", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("AUDIENCEOWN_DEBUG", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    debugLog("oauth", { step:"test" }); debugError("oauth", new Error("test"));
    expect(info).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
  });

  it("allows independent subsystem flags outside production", () => {
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("DEBUG_DATABASE", "true");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    debugError("database", new Error("safe"), { authorization:"Bearer private" });
    expect(error).toHaveBeenCalledWith("[AUDIENCEOWN DEBUG]", expect.objectContaining({ authorization:"[REDACTED]" }));
  });

  it("reports only safe Supabase configuration states and the legacy source", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUDIENCEOWN_DEBUG", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_ADMIN_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-value");
    delete (globalThis as Record<PropertyKey, unknown>)[Symbol.for("audienceown.debug.startup")];
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    reportDevelopmentConfiguration();

    expect(info).toHaveBeenCalledWith("[AUDIENCEOWN CONFIG]", {
      SUPABASE_URL:"configured",
      SUPABASE_ADMIN_KEY:"configured",
      admin_key_source:"legacy_alias",
    });
  });
});
