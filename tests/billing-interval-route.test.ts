import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks=vi.hoisted(()=>({getOptionalViewer:vi.fn(),getCreator:vi.fn(),schedule:vi.fn(),cancel:vi.fn()}));
vi.mock("@/lib/dal",()=>({getOptionalViewer:mocks.getOptionalViewer,getCreator:mocks.getCreator}));
vi.mock("@/lib/billing/interval-switch",()=>({BillingIntervalSwitchError:class extends Error{constructor(public code:string,public status:number){super(code);}},scheduleBillingIntervalSwitch:mocks.schedule,cancelBillingIntervalSwitch:mocks.cancel}));
import { DELETE, POST } from "@/app/api/billing/interval/route";

function request(body:unknown,origin="https://audienceown.com"){return new Request("http://next-internal:3000/api/billing/interval",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});}
describe("/api/billing/interval",()=>{beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("APP_URL","https://audienceown.com");mocks.getOptionalViewer.mockResolvedValue({id:"user-1"});mocks.getCreator.mockResolvedValue({id:"creator-1",owner_user_id:"user-1"});mocks.schedule.mockResolvedValue({currentInterval:"monthly",pendingInterval:"yearly"});mocks.cancel.mockResolvedValue({currentInterval:"monthly",pendingInterval:null});});
  it("accepts only a target interval and resolves the creator server-side",async()=>{expect((await POST(request({interval:"yearly"}))).status).toBe(200);expect(mocks.schedule).toHaveBeenCalledWith("creator-1","yearly");});
  it("rejects arbitrary Price and creator identifiers",async()=>{expect((await POST(request({interval:"yearly",price:"price_attacker",creatorId:"creator-2"}))).status).toBe(400);expect(mocks.schedule).not.toHaveBeenCalled();});
  it("rejects unauthenticated requests",async()=>{mocks.getOptionalViewer.mockResolvedValue(null);expect((await POST(request({interval:"yearly"}))).status).toBe(401);expect(mocks.getCreator).not.toHaveBeenCalled();});
  it("rejects foreign origins before authentication",async()=>{expect((await POST(request({interval:"yearly"},"https://evil.example"))).status).toBe(403);expect(mocks.getOptionalViewer).not.toHaveBeenCalled();});
  it("cancels only the authenticated creator's pending switch",async()=>{const response=await DELETE(request(null));expect(response.status).toBe(200);expect(mocks.cancel).toHaveBeenCalledWith("creator-1");});
});
