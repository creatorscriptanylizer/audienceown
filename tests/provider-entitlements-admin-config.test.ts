import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

import { getCreatorEntitlements } from "@/lib/provider-entitlements";

describe("provider entitlements with the admin client", () => {
  beforeEach(() => rpc.mockReset());

  it("calls the exact server RPCs and preserves Pro behavior", async () => {
    rpc
      .mockResolvedValueOnce({ data: { plan:"pro", subscriptionStatus:"active", currentCount:1, allowed:true }, error:null })
      .mockResolvedValueOnce({ data: { plan:"pro", subscriptionStatus:"active", currentCount:2, allowed:true }, error:null });

    await expect(getCreatorEntitlements("creator-id")).resolves.toEqual({
      isAdmin:false,
      plan:"pro",
      subscriptionStatus:"active",
      providerConnections:{
        official:{ currentCount:1, limit:null, allowed:true },
        backup:{ currentCount:2, limit:null, allowed:true },
      },
    });
    expect(rpc).toHaveBeenNthCalledWith(1, "get_provider_connection_entitlement", { p_creator_id:"creator-id", p_role:"official" });
    expect(rpc).toHaveBeenNthCalledWith(2, "get_provider_connection_entitlement", { p_creator_id:"creator-id", p_role:"backup" });
  });

  it("retains a safe entitlement error for RPC failures", async () => {
    rpc.mockResolvedValue({ data:null, error:{ message:"database unavailable" } });
    await expect(getCreatorEntitlements("creator-id")).rejects.toThrow("entitlements_unavailable");
  });

  it("logs safe per-role RPC diagnostics only in debug development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUDIENCEOWN_DEBUG", "1");
    const error = { code:"PGRST301", message:"bad jwt", details:null, hint:null };
    rpc.mockResolvedValue({ data:null, error });
    const consoleError = vi.spyOn(console,"error").mockImplementation(() => undefined);

    await expect(getCreatorEntitlements("creator-id")).rejects.toThrow("entitlements_unavailable");
    expect(consoleError).toHaveBeenNthCalledWith(1,"provider_entitlement_rpc_error",{
      role:"official",creatorId:"creator-id",rpcName:"get_provider_connection_entitlement",
      code:"PGRST301",message:"bad jwt",details:null,hint:null,
    });
    expect(consoleError).toHaveBeenNthCalledWith(2,"provider_entitlement_rpc_error",{
      role:"backup",creatorId:"creator-id",rpcName:"get_provider_connection_entitlement",
      code:"PGRST301",message:"bad jwt",details:null,hint:null,
    });
    consoleError.mockRestore();
    vi.unstubAllEnvs();
  });
});
