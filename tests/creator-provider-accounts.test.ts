import { describe, expect, it, vi } from "vitest";
import { getCreatorProviderAccounts } from "@/lib/social-providers/creator-provider-accounts";

function query(result: { data: unknown[] | null; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit"]) chain[method] = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function database(results: Record<string, { data: unknown[] | null; error: unknown }>) {
  return { from: vi.fn((table: string) => query(results[table] ?? { data: [], error: null })) };
}

describe("creator provider account query", () => {
  it("treats a successful zero-row query as a valid empty state", async () => {
    const result = await getCreatorProviderAccounts(database({}) as never, "creator-a");
    expect(result).toMatchObject({ connections: [], assets: [], identities: [], accounts: [] });
  });

  it("returns a connected YouTube account without a metric or identity row", async () => {
    const db = database({ connected_accounts: { data: [{ id: "private-id", platform: "youtube", account_type: "official", label: "Channel", url: null, is_primary: true, connection_health: "healthy" }], error: null } });
    const result = await getCreatorProviderAccounts(db as never, "creator-a");
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({ provider: "youtube", connected: true, displayName: "Channel" });
    expect(result.mainAccount).toMatchObject({ provider:"youtube", role:"official", primary:true });
    expect(result.backupAccounts).toEqual([]);
    expect(JSON.stringify(result.accounts)).not.toContain("private-id");
  });

  it("returns Backups independently when there is no current Main", async () => {
    const db=database({connected_accounts:{data:[
      {id:"backup-a",platform:"tiktok",account_type:"backup",label:"TikTok",url:null,connection_health:"healthy",provider_status:"ready"},
      {id:"backup-b",platform:"discord",account_type:"backup",label:"Discord",url:null,connection_health:"disconnected",provider_status:"ready"},
    ],error:null}});
    const result=await getCreatorProviderAccounts(db as never,"creator-a");
    expect(result.mainAccount).toBeNull();
    expect(result.backupAccounts.map((account)=>account.provider)).toEqual(["tiktok","discord"]);
  });

  it("keeps a database error distinguishable from an empty result", async () => {
    const error = { code: "42703", message: "column missing", hint: null };
    const db = database({ provider_asset_bindings: { data: null, error } });
    await expect(getCreatorProviderAccounts(db as never, "creator-a")).rejects.toThrow("creator_provider_accounts_query_failed");
  });
});
