import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn((url: string, key: string) => ({ url, key })),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import {
  createAdminClient,
  resolveSupabaseAdminConfig,
  SupabaseAdminConfigurationError,
  SupabaseAdminEnvironmentMismatchError,
} from "@/lib/supabase/admin";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" };
  delete process.env.SUPABASE_ADMIN_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  createClient.mockClear();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Supabase admin configuration", () => {
  it("uses the canonical server-only admin key", () => {
    process.env.SUPABASE_ADMIN_KEY = "sb_secret_canonical-secret";
    expect(resolveSupabaseAdminConfig()).toEqual({
      url: "https://project.supabase.co",
      key: "sb_secret_canonical-secret",
      keySource: "canonical",
      conflictingAdminCredentials: false,
    });
    expect(createAdminClient()).toEqual(expect.objectContaining({ key: "sb_secret_canonical-secret" }));
  });

  it("supports the existing service-role variable as a legacy alias", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "header.payload.signature";
    expect(resolveSupabaseAdminConfig()).toEqual(expect.objectContaining({
      key: "header.payload.signature",
      keySource: "legacy_alias",
    }));
  });

  it("keeps canonical precedence on loopback and safely reports conflicting aliases", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_ADMIN_KEY = "sb_secret_active-local-stack";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_stale-alias";
    expect(resolveSupabaseAdminConfig()).toEqual(expect.objectContaining({
      key: "sb_secret_active-local-stack",
      keySource: "canonical",
      conflictingAdminCredentials: true,
    }));
  });

  it("accepts a local URL with a local service-role JWT", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_ADMIN_KEY = jwt({ role:"service_role", iss:"supabase-demo" });
    expect(resolveSupabaseAdminConfig()).toEqual(expect.objectContaining({ keySource:"canonical" }));
  });

  it("rejects a clearly hosted JWT paired with a local URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_ADMIN_KEY = jwt({ role:"service_role", ref:"hosted-project" });
    expect(() => resolveSupabaseAdminConfig()).toThrowError(SupabaseAdminEnvironmentMismatchError);
  });

  it("accepts matching hosted URL and hosted JWT identity", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://hosted-project.supabase.co";
    process.env.SUPABASE_ADMIN_KEY = jwt({ role:"service_role", ref:"hosted-project" });
    expect(resolveSupabaseAdminConfig()).toEqual(expect.objectContaining({ keySource:"canonical" }));
  });

  it("rejects mismatched hosted URL and hosted JWT identity", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://expected-project.supabase.co";
    process.env.SUPABASE_ADMIN_KEY = jwt({ role:"service_role", ref:"other-project" });
    expect(() => resolveSupabaseAdminConfig()).toThrowError(SupabaseAdminEnvironmentMismatchError);
  });

  it("ignores a placeholder canonical key in favor of a valid legacy key", () => {
    process.env.SUPABASE_ADMIN_KEY = "replace-with-admin-key";
    process.env.SUPABASE_SECRET_KEY = "header.payload.signature";
    expect(resolveSupabaseAdminConfig()).toEqual(expect.objectContaining({
      key: "header.payload.signature",
      keySource: "legacy_alias",
    }));
  });

  it("fails explicitly and safely when the URL or key is missing", () => {
    expect(() => createAdminClient()).toThrowError(SupabaseAdminConfigurationError);
    expect(() => createAdminClient()).toThrow("Supabase admin credentials are not configured.");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not define or read a public service-role key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ADMIN_KEY = "browser-secret";
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = "browser-secret";
    expect(() => createAdminClient()).toThrowError(SupabaseAdminConfigurationError);
  });
});

function jwt(payload:Record<string,unknown>) {
  return `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}
