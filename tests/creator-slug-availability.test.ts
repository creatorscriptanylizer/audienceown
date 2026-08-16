import{beforeEach,describe,expect,it,vi}from"vitest";
const rpc=vi.fn();
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({rpc})}));
const{checkRecoveryPassNameAvailability}=await import("@/lib/creator-slug-availability");
describe("creator slug availability service",()=>{
 beforeEach(()=>vi.clearAllMocks());
 it("returns available for an unused normalized name",async()=>{rpc.mockResolvedValue({data:"available",error:null});await expect(checkRecoveryPassNameAvailability(" Nana_Name ")).resolves.toEqual({status:"available",normalizedName:"nana-name"});expect(rpc).toHaveBeenCalledWith("check_recovery_pass_name_availability",{p_slug:"nana-name"})});
 it("returns taken without leaking a creator record",async()=>{rpc.mockResolvedValue({data:"taken",error:null});const result=await checkRecoveryPassNameAvailability("nana");expect(result).toEqual({status:"taken",normalizedName:"nana",message:"Username already taken."});expect(result).not.toHaveProperty("creatorId")});
 it("blocks reserved and invalid names without querying",async()=>{await expect(checkRecoveryPassNameAvailability("dashboard")).resolves.toMatchObject({status:"reserved"});await expect(checkRecoveryPassNameAvailability("hello world")).resolves.toMatchObject({status:"invalid"});expect(rpc).not.toHaveBeenCalled()});
 it("returns a stable safe error contract for RPC failures",async()=>{rpc.mockResolvedValue({data:null,error:{code:"PGRST202",message:"RPC missing"}});await expect(checkRecoveryPassNameAvailability("unused-name")).resolves.toEqual({status:"error",normalizedName:"unused-name",code:"availability_check_failed",message:"We couldn't check this name right now."})});
 it("rejects malformed RPC responses",async()=>{rpc.mockResolvedValue({data:null,error:null});await expect(checkRecoveryPassNameAvailability("unused-name")).resolves.toMatchObject({status:"error",code:"availability_check_failed"})});
});
