import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";

const rpc=vi.fn();
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({rpc})}));

import {canCreateProviderConnection,getCreatorEntitlements} from "@/lib/provider-entitlements";

const admin={id:"admin-user-id",email:"enkiakka@gmail.com"};
const normal={id:"normal-user-id",email:"creator@example.test"};

function freeAtLimit(name:string,args?:{p_user_id?:string}){
  if(name==="provision_configured_app_admin")return Promise.resolve({data:null,error:null});
  if(name==="is_app_admin")return Promise.resolve({data:args?.p_user_id===admin.id,error:null});
  return Promise.resolve({data:{plan:"free",subscriptionStatus:"inactive",currentCount:1,limit:1,allowed:false},error:null});
}

describe("admin provider connection entitlements",()=>{
  beforeEach(()=>{vi.stubEnv("AUDIENCEOWN_ADMIN_EMAILS","enkiakka@gmail.com");rpc.mockReset();rpc.mockImplementation(freeAtLimit)});
  afterEach(()=>vi.unstubAllEnvs());
  it("keeps a normal Free user blocked",async()=>{
    await expect(canCreateProviderConnection("creator-id","backup","new_connection",normal)).resolves.toMatchObject({plan:"free",limit:1,allowed:false});
  });
  it("allows an admin on Free to add official and backup accounts",async()=>{
    const entitlement=await getCreatorEntitlements("creator-id",admin);
    expect(entitlement).toMatchObject({isAdmin:true,plan:"free",providerConnections:{official:{limit:null,allowed:true},backup:{limit:null,allowed:true}}});
    expect(rpc).toHaveBeenCalledWith("provision_configured_app_admin",{p_user_id:admin.id,p_display_email:admin.email});
    expect(rpc).toHaveBeenCalledWith("is_app_admin",{p_user_id:admin.id});
  });
  it("does not trust request payload flags for a non-admin",async()=>{
    const forged={...normal,isAdmin:true} as typeof normal&{isAdmin:boolean};
    await expect(canCreateProviderConnection("creator-id","official","new_connection",forged)).resolves.toMatchObject({limit:1,allowed:false});
  });
  it("preserves Pro behavior",async()=>{
    rpc.mockImplementation((name:string)=>name==="is_app_admin"?Promise.resolve({data:false,error:null}):Promise.resolve({data:{plan:"pro",subscriptionStatus:"active",currentCount:4,limit:null,allowed:true},error:null}));
    await expect(getCreatorEntitlements("creator-id",normal)).resolves.toMatchObject({isAdmin:false,plan:"pro",providerConnections:{official:{limit:null,allowed:true},backup:{limit:null,allowed:true}}});
  });
});
