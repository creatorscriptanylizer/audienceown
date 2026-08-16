import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ rpc: vi.fn(), record: { creator: { slug: "creator" }, authenticity: { state: "verified_identity" } } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: h.rpc }) }));
vi.mock("@/lib/authenticity/public", () => ({ parseAuthenticityRecord: (value: unknown) => value === "published" ? h.record : null }));
vi.mock("@/lib/ecosystem/public", () => ({ parsePublicEcosystemGraph: () => ({ destinations: [] }) }));

import { getPublicAuthenticity } from "@/lib/authenticity/server";

const source = (path: string) => readFileSync(path, "utf8");

describe("Authenticity route-tree availability", () => {
  beforeEach(() => h.rpc.mockReset());

  it("returns available for a successfully published record", async () => {
    h.rpc.mockResolvedValueOnce({data:"published",error:null}).mockResolvedValueOnce({data:{destinations:[]},error:null});
    await expect(getPublicAuthenticity("creator")).resolves.toMatchObject({status:"available",data:h.record});
  });

  it("returns absent only when the public query succeeds without a record", async () => {
    h.rpc.mockResolvedValueOnce({data:null,error:null}).mockResolvedValueOnce({data:null,error:null});
    await expect(getPublicAuthenticity("missing")).resolves.toEqual({status:"absent",data:null});
  });

  it("returns unavailable, never absent, when either projection fails", async () => {
    h.rpc.mockResolvedValueOnce({data:null,error:{message:"offline"}}).mockResolvedValueOnce({data:null,error:null});
    await expect(getPublicAuthenticity("broken")).resolves.toEqual({status:"unavailable",data:null});
    h.rpc.mockResolvedValueOnce({data:"published",error:null}).mockResolvedValueOnce({data:null,error:{message:"offline"}});
    await expect(getPublicAuthenticity("broken-ecosystem")).resolves.toEqual({status:"unavailable",data:null});
  });

  it("distinguishes successful empty continuity and subscriptions from failures", () => {
    const layout = source("app/dashboard/authenticity/layout.tsx");
    expect(layout).toContain("No continuity statements yet.");
    expect(layout).toContain("Continuity statements unavailable");
    expect(layout).toContain("No network subscriptions yet.");
    expect(layout).toContain("Network subscriptions unavailable");
    expect(layout).toContain("statementsResult.error ?");
    expect(layout).toContain("subscriptionsResult.error ?");
  });

  it("keeps public, continuity, and subscription availability independent", () => {
    const layout = source("app/dashboard/authenticity/layout.tsx");
    expect(layout).toContain('publicResult.status === "unavailable"');
    expect(layout).toContain('publicResult.status === "absent"');
    expect(layout).toContain("statementsResult.error ?");
    expect(layout).toContain("subscriptionsResult.error ?");
    expect(layout).not.toMatch(/if \(.*(?:statementsResult|subscriptionsResult)\.error.*\) return/);
  });

  it("preserves the no-write-on-read boundary", () => {
    for (const file of ["app/dashboard/authenticity/page.tsx","app/dashboard/authenticity/layout.tsx","lib/authenticity/server.ts"]) {
      const value = source(file);
      expect(value).not.toMatch(/\.(insert|update|upsert|delete)\(/);
      expect(value).not.toContain('rpc("ensure_creator_identity_profile")');
      expect(value).not.toContain('rpc("ensure_creator_authenticity_profile")');
    }
  });

  it("updates every consumer to inspect the discriminant", () => {
    const files = [
      "lib/authenticity/lookup.ts","app/verify/[slug]/page.tsx","app/verify/[slug]/layout.tsx","app/embed/verify/[slug]/page.tsx",
      "app/dashboard/authenticity/layout.tsx","app/api/internal/authenticity/network/refresh-manifests/route.ts","app/api/internal/authenticity/check-domains/route.ts",
      "app/api/public/creators/[slug]/authenticity/events/route.ts","app/api/public/creators/[slug]/authenticity/route.ts","app/api/public/creators/[slug]/authenticity/assertion/route.ts",
      "app/api/public/creators/[slug]/manifest/route.ts","app/api/public/creators/[slug]/continuity/route.ts","app/api/public/creators/[slug]/continuity/[statementId]/route.ts",
    ];
    for (const file of files) expect(source(file),file).toMatch(/\.status\s*(?:===|!==)/);
  });

  it("keeps 503 unavailable separate from 404 absent on public APIs", () => {
    for (const file of ["app/api/public/creators/[slug]/authenticity/route.ts","app/api/public/creators/[slug]/manifest/route.ts","app/api/public/creators/[slug]/authenticity/assertion/route.ts","app/api/public/creators/[slug]/authenticity/events/route.ts","app/api/public/creators/[slug]/continuity/route.ts","app/api/public/creators/[slug]/continuity/[statementId]/route.ts"]) {
      const value = source(file);
      expect(value,file).toMatch(/status\s*===\s*"unavailable"/);
      expect(value,file).toMatch(/status\s*:\s*503|publicAuthenticityUnavailable/);
      expect(value,file).toMatch(/status\s*===\s*"absent"/);
      expect(value,file).toMatch(/status\s*:\s*404/);
    }
    expect(source("lib/authenticity/public-api.ts")).toMatch(/status\s*:\s*503/);
    expect(source("lib/authenticity/public-api.ts")).toContain('"cache-control": "no-store"');
  });
});
