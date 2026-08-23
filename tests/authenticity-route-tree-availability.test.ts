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

  it("keeps technical verification tools out of creator-facing authenticity UI", () => {
    const layout = source("app/dashboard/authenticity/layout.tsx"),page=source("app/dashboard/authenticity/page.tsx");
    expect(layout).not.toContain("Webhook subscriptions");
    expect(layout).not.toContain("Portable identity proofs");
    for(const removed of["Advanced verification tools","Embed verification","Verification assertions","Verification history"])expect(page).not.toContain(removed);
    expect(source("app/api/public/creators/[slug]/authenticity/assertion/route.ts")).toContain("GET");
    expect(source("app/embed/verify/[slug]/page.tsx")).toContain("authenticity.embedEnabled");
  });

  it("uses the canonical public projection in the verified identity service", () => {
    const service=source("lib/verified-identity-dashboard.ts");
    expect(service).toContain('rpc("get_public_creator_authenticity"');
    expect(service).toContain("parseAuthenticityRecord(publicResult.data)");
    expect(service).toContain("record?.emergency??null");
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
      "lib/authenticity/lookup.ts","app/verify/[slug]/page.tsx","app/embed/verify/[slug]/page.tsx",
      "app/api/internal/authenticity/network/refresh-manifests/route.ts","app/api/internal/authenticity/check-domains/route.ts",
      "app/api/public/creators/[slug]/authenticity/events/route.ts","app/api/public/creators/[slug]/authenticity/route.ts","app/api/public/creators/[slug]/authenticity/assertion/route.ts",
      "app/api/public/creators/[slug]/manifest/route.ts","app/api/public/creators/[slug]/continuity/route.ts","app/api/public/creators/[slug]/continuity/[statementId]/route.ts",
    ];
    for (const file of files) expect(source(file),file).toMatch(/\.status\s*(?:===|!==)/);
    expect(source("app/verify/[slug]/layout.tsx")).not.toContain("getPublicAuthenticity");
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
