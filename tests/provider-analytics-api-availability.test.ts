import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getCreator: vi.fn(), requireCreator: vi.fn(), createClient: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({ getCreator: h.getCreator, requireCreator: h.requireCreator }));
vi.mock("@/lib/supabase/server", () => ({ createClient: h.createClient }));

import { GET as expansionOne } from "@/app/api/analytics/providers/expansion-one/route";
import { GET as expansionTwo } from "@/app/api/analytics/providers/expansion-two/route";
import { GET as expansionThree } from "@/app/api/analytics/providers/expansion-three/route";
import { GET as expansionFour } from "@/app/api/analytics/providers/expansion-four/route";
import { GET as audienceMetrics } from "@/app/api/analytics/providers/audience-metrics/route";

type QueryResult = { data: unknown; error: unknown };
const ok = (data: unknown): QueryResult => ({ data, error: null });
const failed = (): QueryResult => ({ data: null, error: { code: "42501", message: "private database detail" } });

function query(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in"]) builder[method] = vi.fn(() => builder);
  builder.then = (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function database(results: Record<string, QueryResult>) {
  return {
    from: vi.fn((table: string) => query(results[table] ?? (() => { throw new Error(`Missing result for ${table}`); })())),
    rpc: vi.fn((name: string) => Promise.resolve(results[name] ?? (() => { throw new Error(`Missing result for ${name}`); })())),
  };
}

const oneTables = ["social_detection_events", "creator_updates", "provider_content_sources"];
const twoTables = ["social_detection_events", "creator_updates", "connected_accounts", "provider_asset_bindings"];
const fourTables = ["social_detection_events", "creator_updates", "connected_accounts", "manual_service_connections"];
const allEmpty = (tables: string[]) => Object.fromEntries(tables.map((table) => [table, ok([])]));
const failureAt = (tables: string[], failedTable: string) => Object.fromEntries(tables.map((table) => [table, table === failedTable ? failed() : ok([])]));

beforeEach(() => {
  vi.clearAllMocks();
  h.getCreator.mockResolvedValue({ id: "creator-1" });
  h.requireCreator.mockResolvedValue({ id: "creator-1" });
});

function expectUnavailable(response: Response) {
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return expect(response.json()).resolves.toEqual({ error: "Temporarily unavailable" });
}

describe("provider analytics successful domain states", () => {
  it("expansion one returns real zeros and an empty source list after all reads succeed", async () => {
    h.createClient.mockResolvedValue(database(allEmpty(oneTables)));
    const response = await expansionOne();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ twitchEvents: 0, draftsGenerated: 0, sources: [] });
  });

  it("expansion two returns not_connected and null only after connection and sync reads succeed", async () => {
    h.createClient.mockResolvedValue(database(allEmpty(twoTables)));
    const response = await expansionTwo();
    expect(response.status).toBe(200);
    expect((await response.json()).providers.tiktok).toMatchObject({ detected: 0, connectionHealth: "not_connected", lastSync: null });
  });

  it("expansion three preserves successful empty sibling analytics", async () => {
    h.createClient.mockResolvedValue(database(allEmpty(twoTables)));
    const response = await expansionThree();
    expect(response.status).toBe(200);
    expect((await response.json()).providers.x).toMatchObject({ detected: 0, connectionHealth: "not_connected", lastSync: null });
  });

  it("expansion four returns real zeros, not_connected, and never-synced null after successful reads", async () => {
    h.createClient.mockResolvedValue(database(allEmpty(fourTables)));
    const response = await expansionFour();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.providers.spotify).toMatchObject({ detected: 0, connectionHealth: "not_connected", lastSync: null });
    expect(body.verifiedManualServices).toBe(0);
  });
});

describe("required-source failures", () => {
  for (const table of oneTables) {
    it(`expansion one returns 503 when ${table} fails`, async () => {
      h.createClient.mockResolvedValue(database(failureAt(oneTables, table)));
      await expectUnavailable(await expansionOne());
    });
  }

  for (const table of twoTables) {
    it(`expansion two returns 503 instead of synthetic analytics when ${table} fails`, async () => {
      h.createClient.mockResolvedValue(database(failureAt(twoTables, table)));
      await expectUnavailable(await expansionTwo());
    });
    it(`expansion three sibling returns 503 when ${table} fails`, async () => {
      h.createClient.mockResolvedValue(database(failureAt(twoTables, table)));
      await expectUnavailable(await expansionThree());
    });
  }

  for (const table of fourTables) {
    it(`expansion four returns 503 instead of zero/null/not_connected when ${table} fails`, async () => {
      h.createClient.mockResolvedValue(database(failureAt(fourTables, table)));
      await expectUnavailable(await expansionFour());
    });
  }

  it("does not convert a permission failure into provider analytics", async () => {
    h.createClient.mockResolvedValue(database(failureAt(twoTables, "connected_accounts")));
    await expectUnavailable(await expansionTwo());
  });

  it("keeps audience-metrics RPC failures uncached and unavailable", async () => {
    h.createClient.mockResolvedValue(database({ get_creator_platform_audience_metrics: failed() }));
    await expectUnavailable(await audienceMetrics());
  });

  it("distinguishes database configuration failure from unauthenticated access", async () => {
    h.createClient.mockResolvedValue(null);
    await expectUnavailable(await expansionTwo());
    await expectUnavailable(await expansionThree());
    await expectUnavailable(await expansionFour());
    await expectUnavailable(await audienceMetrics());
  });
});
