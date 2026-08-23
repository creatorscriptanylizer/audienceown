import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOAuthState, validateOAuthState } from "@/lib/social-providers/oauth";
import { applyRecoveryAutoLinkIntent, validateRecoveryMainContext } from "@/lib/social-providers/recovery-auto-link";

const main={id:"11111111-1111-4111-8111-111111111111",url:"https://youtube.com/@main",external_account_id:"main",connection_health:"healthy",provider_status:"ready"};
const recovery={id:"22222222-2222-4222-8222-222222222222",platform:"instagram",account_type:"backup",url:"https://instagram.com/recovery",external_account_id:"recovery",connection_health:"healthy",provider_status:"ready"};

function database(options:{main?:typeof main|null;recovery?:typeof recovery|null;existingNetworkId?:string;rpcError?:{message:string}|null}={}){
  let connectedReads=0;const rpc=vi.fn().mockResolvedValue({error:options.rpcError??null});
  type Query={select:()=>Query;eq:()=>Query;maybeSingle:()=>Promise<{data:unknown;error:null}>;insert:(value:unknown)=>Promise<{error:null}>};
  const db={rpc,from:vi.fn((table:string)=>{const query:Query={select:()=>query,eq:()=>query,maybeSingle:async()=>table==="connected_accounts"?{data:connectedReads++===0?(options.main===undefined?main:options.main):(options.recovery===undefined?recovery:options.recovery),error:null}:table==="recovery_networks"?{data:options.main===null?null:{id:"network"},error:null}:{data:options.existingNetworkId?{recovery_network_id:options.existingNetworkId}:null,error:null},insert:async()=>({error:null})};return query;})};
  return{db:db as never,rpc};
}

describe("post-OAuth Recovery auto-link",()=>{
  beforeEach(()=>{process.env.SOCIAL_OAUTH_STATE_SECRET="recovery-state-test-secret";vi.spyOn(console,"info").mockImplementation(()=>{});vi.spyOn(console,"warn").mockImplementation(()=>{});});

  it("keeps normal OAuth unchanged when no Main context exists",async()=>{const mock=database();expect(await applyRecoveryAutoLinkIntent(mock.db,{creatorId:"creator",connectedAccountId:recovery.id,provider:"instagram",role:"backup"})).toBe("absent");expect(mock.rpc).not.toHaveBeenCalled();});

  it("binds initiation validation to the authenticated creator and Main role",async()=>{const eq=vi.fn();const query={select:vi.fn(),eq,maybeSingle:vi.fn().mockResolvedValue({data:main,error:null})};query.select.mockReturnValue(query);eq.mockReturnValue(query);expect(await validateRecoveryMainContext({from:vi.fn().mockReturnValue(query)} as never,{creatorId:"creator-a",mainAccountId:main.id})).toBe(true);expect(eq).toHaveBeenCalledWith("creator_id","creator-a");expect(eq).toHaveBeenCalledWith("account_type","official");});

  it("cryptographically binds the optional Main context and rejects tampering",()=>{const state=createOAuthState({creatorId:"creator",userId:"user",provider:"instagram",nonce:"nonce",role:"backup",recoveryForMainAccountId:main.id,expiresAt:Date.now()+60_000});expect(validateOAuthState(state,"instagram","nonce")).toMatchObject({ok:true,state:{recoveryForMainAccountId:main.id}});const [body,signature]=state.split("."),payload=JSON.parse(Buffer.from(body,"base64url").toString());payload.recoveryForMainAccountId=recovery.id;const tampered=`${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;expect(validateOAuthState(tampered,"instagram","nonce")).toEqual({ok:false,reason:"state_signature_invalid"});});

  it("adds one destination through the exclusive assignment RPC",async()=>{const mock=database();expect(await applyRecoveryAutoLinkIntent(mock.db,{creatorId:"creator",connectedAccountId:recovery.id,provider:"instagram",role:"backup",recoveryForMainAccountId:main.id})).toBe("linked");expect(mock.rpc).toHaveBeenCalledWith("assign_recovery_account_to_network",{p_creator_id:"creator",p_recovery_network_id:"network",p_recovery_account_id:recovery.id});});

  it("preserves placement intent while a canonically connected Recovery needs setup",async()=>{const mock=database({recovery:{...recovery,provider_status:"asset_selection_required"}});expect(await applyRecoveryAutoLinkIntent(mock.db,{creatorId:"creator",connectedAccountId:recovery.id,provider:"instagram",role:"backup",recoveryForMainAccountId:main.id})).toBe("linked");expect(mock.rpc).toHaveBeenCalledWith("assign_recovery_account_to_network",expect.any(Object));});

  it("atomically assigns a newly connected Main to its signed empty slot",async()=>{const rpc=vi.fn().mockResolvedValue({error:null});const db={rpc} as never;expect(await applyRecoveryAutoLinkIntent(db,{creatorId:"creator",connectedAccountId:main.id,provider:"youtube",role:"official",recoveryForMainAccountId:"33333333-3333-4333-8333-333333333333"})).toBe("linked");expect(rpc).toHaveBeenCalledWith("assign_main_to_recovery_network",expect.objectContaining({p_main_account_id:main.id}));});

  it("is idempotent when the relationship already exists",async()=>{const mock=database({existingNetworkId:"network"});expect(await applyRecoveryAutoLinkIntent(mock.db,{creatorId:"creator",connectedAccountId:recovery.id,provider:"instagram",role:"backup",recoveryForMainAccountId:main.id})).toBe("existing");expect(mock.rpc).not.toHaveBeenCalled();});

  it("rejects a Recovery account already owned by another network",async()=>{const mock=database({existingNetworkId:"other-network"});expect(await applyRecoveryAutoLinkIntent(mock.db,{creatorId:"creator",connectedAccountId:recovery.id,provider:"instagram",role:"backup",recoveryForMainAccountId:main.id})).toBe("failed");expect(mock.rpc).not.toHaveBeenCalled();});

  it("preserves the connected Recovery account when Main revalidation fails",async()=>{const mock=database({main:null});expect(await applyRecoveryAutoLinkIntent(mock.db,{creatorId:"creator",connectedAccountId:recovery.id,provider:"instagram",role:"backup",recoveryForMainAccountId:main.id})).toBe("failed");expect(mock.rpc).not.toHaveBeenCalled();});

  it("turns unexpected relationship errors into partial success",async()=>{const db={from:vi.fn(()=>{throw new Error("database unavailable");})} as never;expect(await applyRecoveryAutoLinkIntent(db,{creatorId:"creator",connectedAccountId:recovery.id,provider:"instagram",role:"backup",recoveryForMainAccountId:main.id})).toBe("failed");});

  it("rejects a Recovery provider mismatch",async()=>{const provider=database();expect(await applyRecoveryAutoLinkIntent(provider.db,{creatorId:"creator",connectedAccountId:recovery.id,provider:"youtube",role:"backup",recoveryForMainAccountId:main.id})).toBe("failed");expect(provider.rpc).not.toHaveBeenCalled();});
});
