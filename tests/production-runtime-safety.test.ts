import { describe, expect, it } from "vitest";
import { assertProductionRuntimeSafety, productionRuntimeState } from "@/lib/production-runtime-safety";

describe("production runtime Supabase safety", () => {
  it.each(["http://localhost:54321", "http://127.0.0.1:54321", "http://[::1]:54321", "http://auth.localhost:54321"])("rejects local Supabase in production: %s", (url) => {
    expect(() => assertProductionRuntimeSafety("production", url)).toThrow(/Refusing production startup/);
  });

  it("allows the hosted production project", () => {
    expect(assertProductionRuntimeSafety("production", "https://jngmxlcibqmtrvskxdcw.supabase.co")).toEqual({
      environment: "production",
      nextMode: "start",
      supabaseProjectHost: "jngmxlcibqmtrvskxdcw.supabase.co",
      localSupabaseDetected: false,
    });
  });

  it("does not block local development", () => {
    expect(productionRuntimeState("development", "http://127.0.0.1:54321")).toMatchObject({ nextMode: "dev", localSupabaseDetected: true });
    expect(() => assertProductionRuntimeSafety("development", "http://127.0.0.1:54321")).not.toThrow();
  });

  it.each([undefined, "not a URL"])("rejects missing or invalid production configuration", (url) => {
    expect(() => assertProductionRuntimeSafety("production", url)).toThrow(/Refusing production startup/);
  });
});
