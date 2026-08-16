import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn((url: string, key: string) => ({ url, key })),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import {
  createAdminClient,
  resolveSupabaseAdminConfig,
  SupabaseAdminConfigurationError,
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

  it("prefers the active stack secret over a stale canonical key on loopback", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_ADMIN_KEY = "sb_secret_stale-canonical";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_active-local-stack";
    expect(resolveSupabaseAdminConfig()).toEqual(expect.objectContaining({
      key: "sb_secret_active-local-stack",
      keySource: "legacy_alias",
    }));
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
