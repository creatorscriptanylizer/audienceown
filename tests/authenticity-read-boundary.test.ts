import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Authenticity read boundary", () => {
  const page = read("app/dashboard/authenticity/page.tsx");
  const layout = read("app/dashboard/authenticity/layout.tsx");
  const service = read("lib/verified-identity-dashboard.ts");
  const actions = read("app/dashboard/authenticity/actions.ts");

  it("never invokes write-capable ensure RPCs while rendering", () => {
    for (const source of [page, layout]) {
      expect(source).not.toContain('rpc("ensure_creator_identity_profile")');
      expect(source).not.toContain('rpc("ensure_creator_authenticity_profile")');
      expect(source).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    }
    expect(page).toContain("getVerifiedIdentityDashboardData");
    expect(service).toContain('.maybeSingle()');
  });

  it("distinguishes the pending verified-presence experience from failed data", () => {
    expect(page).toContain("Build your verified presence");
    expect(page).toContain("Verified identity couldn’t be loaded.");
    expect(page).toContain("try{data=await getVerifiedIdentityDashboardData");
    expect(service).toContain('profile?.public_title??""');
  });

  it("creates both profiles only behind the explicit authenticated action", () => {
    expect(actions).toContain("export async function setupAuthenticity()");
    expect(actions).toContain("await requireCreator()");
    expect(actions.match(/rpc\("ensure_creator_identity_profile"\)/g)).toHaveLength(1);
    expect(actions.match(/rpc\("ensure_creator_authenticity_profile"\)/g)).toHaveLength(1);
    expect(page).not.toContain("setupAuthenticity");
  });

  it("keeps the public projection read-only and absent when unpublished", () => {
    const migration = read("supabase/migrations/20260817000000_public_authenticity.sql");
    expect(migration).toMatch(/get_public_creator_authenticity\(p_slug text\)returns jsonb language plpgsql stable security definer/);
    expect(migration).toContain("if not found then return null");
  });
});
