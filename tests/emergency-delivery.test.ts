import{beforeEach,describe,expect,it,vi}from"vitest";
const publish=vi.fn();vi.mock("@/lib/update-delivery",()=>({publishDeliveryQueue:publish}));
describe("emergency Recovery Pass delivery integration",()=>{beforeEach(()=>publish.mockReset());
it("activates through the RPC then reuses the canonical delivery queue",async()=>{const{activateAndDeliverEmergency}=await import("@/lib/emergency/activation");
const rpc=vi.fn().mockResolvedValue({data:{status:"active",creator_update_id:"update-1",creator_id:"creator-1"},error:null});
publish.mockResolvedValue({status:"published",updateId:"update-1",queued:2});
const result=await activateAndDeliverEmergency("incident-1",{rpc}as never,"authorization-1");expect(rpc).toHaveBeenCalledTimes(1);expect(rpc).toHaveBeenCalledWith("activate_emergency",{p_emergency_id:"incident-1",p_authorization_session_id:"authorization-1"});
expect(publish).toHaveBeenCalledWith("update-1","creator-1",null,expect.anything());expect(result.delivery.queued).toBe(2);});
});
