import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getPublicAuthenticity: vi.fn(),
  recordAuthenticityView: vi.fn(),
  createAdminClient: vi.fn(),
  getPublicEcosystemResult: vi.fn(),
}));

vi.mock("@/lib/authenticity/server", () => ({
  getPublicAuthenticity: h.getPublicAuthenticity,
  recordAuthenticityView: h.recordAuthenticityView,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: h.createAdminClient }));
vi.mock("@/lib/ecosystem/server", () => ({
  getPublicEcosystemResult: h.getPublicEcosystemResult,
}));

import { GET as continuityDetail } from "@/app/api/public/creators/[slug]/continuity/[statementId]/route";
import { GET as continuityFeed } from "@/app/api/public/creators/[slug]/continuity/route";
import { GET as eventsFeed } from "@/app/api/public/creators/[slug]/authenticity/events/route";
import { GET as identityRoute } from "@/app/api/public/creators/[slug]/identity/route";
import { GET as ecosystemRoute } from "@/app/api/public/creators/[slug]/ecosystem/route";

type QueryResult = { data: unknown; error: unknown };

function query(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "lt", "in", "order", "limit", "is", "gt", "filter", "maybeSingle", "single"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function admin(results: Record<string, QueryResult[]>) {
  return {
    from: vi.fn((table: string) => {
      const result = results[table]?.shift();
      if (!result) throw new Error(`Missing mocked result for ${table}`);
      return query(result);
    }),
  };
}

function rpcAdmin(results: Record<string, QueryResult>) {
  return { rpc: vi.fn((name: string) => Promise.resolve(results[name])) };
}

const ok = (data: unknown): QueryResult => ({ data, error: null });
const failed = (): QueryResult => ({ data: null, error: { code: "42501", message: "hidden database detail" } });
const context = (slug = "creator") => ({ params: Promise.resolve({ slug }) });
const detailContext = (slug = "creator") => ({ params: Promise.resolve({ slug, statementId: "statement-1" }) });
const request = (path: string) => new Request(`https://example.test${path}`);
const statement = {
  payload: { sub: "creator" }, key_id: "key-1", signature: "signature", revoked_at: null,
  superseded_at: null, expires_at: "2027-01-01T00:00:00Z", creator_id: "creator-1",
};
const feedStatement = {
  id: 7, statement_version: 1, statement_type: "handle_change", provider: "youtube",
  previous_public_url: "https://example.test/old", current_public_url: "https://example.test/new",
  reason_code: "creator_update", issued_at: "2026-08-01T00:00:00Z", expires_at: null,
  revoked_at: null, superseded_at: null, key_id: "key-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.getPublicAuthenticity.mockResolvedValue({
    status: "available",
    data: { authenticity: { verificationUrl: "/verify/creator" } },
  });
});

describe("public continuity statement detail", () => {
  it("A: returns 200 for a statement owned by the public creator", async () => {
    h.createAdminClient.mockReturnValue(admin({ creator_continuity_statements: [ok(statement)], creators: [ok({ public_slug: "creator" })] }));
    expect((await continuityDetail(request("/detail"), detailContext())).status).toBe(200);
  });

  it("B: returns 404 only after a successful missing statement lookup", async () => {
    h.createAdminClient.mockReturnValue(admin({ creator_continuity_statements: [ok(null)] }));
    expect((await continuityDetail(request("/detail"), detailContext())).status).toBe(404);
  });

  it("C: returns an uncached 503 when the statement query fails", async () => {
    h.createAdminClient.mockReturnValue(admin({ creator_continuity_statements: [failed()] }));
    const response = await continuityDetail(request("/detail"), detailContext());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Temporarily unavailable" });
  });

  it("D: returns 503, not 404, when the ownership lookup fails", async () => {
    h.createAdminClient.mockReturnValue(admin({ creator_continuity_statements: [ok(statement)], creators: [failed()] }));
    const response = await continuityDetail(request("/detail"), detailContext());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("E: returns 404 after a successful slug mismatch", async () => {
    h.createAdminClient.mockReturnValue(admin({ creator_continuity_statements: [ok(statement)], creators: [ok({ public_slug: "other" })] }));
    expect((await continuityDetail(request("/detail"), detailContext())).status).toBe(404);
  });
});

describe("public continuity collection", () => {
  it("F: returns a truthful empty array after a successful zero-row read", async () => {
    h.createAdminClient.mockReturnValue(admin({ creators: [ok({ id: "creator-1" })], creator_continuity_statements: [ok([])] }));
    const response = await continuityFeed(request("/continuity"), context());
    expect(response.status).toBe(200);
    expect((await response.json()).statements).toEqual([]);
  });

  it("G: preserves real statements on success", async () => {
    h.createAdminClient.mockReturnValue(admin({ creators: [ok({ id: "creator-1" })], creator_continuity_statements: [ok([feedStatement])] }));
    const response = await continuityFeed(request("/continuity"), context());
    expect(response.status).toBe(200);
    expect((await response.json()).statements).toHaveLength(1);
  });

  it("H: returns 503 without an empty feed when the collection query fails", async () => {
    h.createAdminClient.mockReturnValue(admin({ creators: [ok({ id: "creator-1" })], creator_continuity_statements: [failed()] }));
    const response = await continuityFeed(request("/continuity"), context());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Temporarily unavailable" });
  });
});

describe("public authenticity events", () => {
  const eventAdmin = (auth: QueryResult, identity: QueryResult) => admin({
    creators: [ok({ id: "creator-1" })], creator_authenticity_events: [auth], creator_identity_events: [identity],
  });

  it("I: returns a truthful empty array after both event reads succeed empty", async () => {
    h.createAdminClient.mockReturnValue(eventAdmin(ok([]), ok([])));
    const response = await eventsFeed(request("/events"), context());
    expect(response.status).toBe(200);
    expect((await response.json()).items).toEqual([]);
  });

  it("J: returns merged events when both sources succeed", async () => {
    h.createAdminClient.mockReturnValue(eventAdmin(
      ok([{ id: 2, event_type: "assertion_issued", created_at: "2026-08-02T00:00:00Z" }]),
      ok([{ id: 1, event_type: "domain_verified", created_at: "2026-08-01T00:00:00Z" }]),
    ));
    const response = await eventsFeed(request("/events"), context());
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(2);
  });

  it("K: returns 503 when the authenticity-event source fails", async () => {
    h.createAdminClient.mockReturnValue(eventAdmin(failed(), ok([])));
    const response = await eventsFeed(request("/events"), context());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("L-M: returns 503 without partial or empty items when identity events fail", async () => {
    h.createAdminClient.mockReturnValue(eventAdmin(
      ok([{ id: 2, event_type: "assertion_issued", created_at: "2026-08-02T00:00:00Z" }]), failed(),
    ));
    const response = await eventsFeed(request("/events"), context());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Temporarily unavailable" });
  });
});

describe("sibling public Authenticity routes", () => {
  it("does not turn an identity graph RPC failure into 404", async () => {
    h.createAdminClient.mockReturnValue(rpcAdmin({
      get_public_creator_identity_graph: failed(), get_public_creator_trust: ok(null),
    }));
    const response = await identityRoute(request("/identity"), context());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not turn a required identity trust RPC failure into partial success", async () => {
    h.createAdminClient.mockReturnValue(rpcAdmin({
      get_public_creator_identity_graph: ok({ creator: {} }), get_public_creator_trust: failed(),
    }));
    expect((await identityRoute(request("/identity"), context())).status).toBe(503);
  });

  it("does not turn an ecosystem source failure into 404", async () => {
    h.getPublicEcosystemResult.mockResolvedValue({
      status: "unavailable", data: null, query: "public_ecosystem_graph", error: { code: "42501" },
    });
    const response = await ecosystemRoute(request("/ecosystem"), context());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("preserves successful ecosystem absence as 404", async () => {
    h.getPublicEcosystemResult.mockResolvedValue({ status: "absent", data: null });
    expect((await ecosystemRoute(request("/ecosystem"), context())).status).toBe(404);
  });
});
