import{describe,expect,it}from"vitest";import{isDeliveryWorkerAuthorized}from"@/lib/delivery-worker-auth";
describe("AI worker authentication",()=>{it("requires an exact configured bearer secret",()=>{expect(isDeliveryWorkerAuthorized("Bearer ai-worker","ai-worker")).toBe(true);
expect(isDeliveryWorkerAuthorized("Bearer wrong","ai-worker")).toBe(false);expect(isDeliveryWorkerAuthorized("Bearer ai-worker",undefined)).toBe(false);});});
