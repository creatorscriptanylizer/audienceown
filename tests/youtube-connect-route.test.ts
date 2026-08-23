import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createState: vi.fn(() => "signed-state"),
  authorizationUrl: vi.fn(() => "https://accounts.google.test/oauth"),
  setCookie: vi.fn(),
  maybeSingle: vi.fn(async (): Promise<{ data:null | { id:string; account_type:string }; error:null }> => ({ data:null, error:null })),
  encryptionState: vi.fn(() => "configured" as "configured" | "missing" | "invalid_format"),
  rpc: vi.fn(async (_name:string,args:{p_role:string}) => ({data:{plan:"free",subscriptionStatus:"inactive",currentCount:0,limit:1,allowed:true,role:args.p_role},error:null})),
}));

vi.mock("next/headers", () => ({ cookies:vi.fn(async () => ({ set:mocks.setCookie })) }));
vi.mock("@/lib/dal", () => ({
  getViewer:vi.fn(async () => ({ id:"user-1" })),
  getCreator:vi.fn(async () => ({ id:"creator-1" })),
}));
vi.mock("@/lib/youtube-oauth", () => ({
  createYouTubeOAuthState:mocks.createState,
  getYouTubeAuthorizationUrl:mocks.authorizationUrl,
}));
vi.mock("@/lib/social-secrets", () => ({ socialTokenEncryptionState:mocks.encryptionState }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient:() => {
  const chain = { select:vi.fn(() => chain), eq:vi.fn(() => chain), maybeSingle:mocks.maybeSingle };
  return { from:vi.fn(() => chain), rpc:mocks.rpc };
} }));

import { GET } from "@/app/api/integrations/youtube/connect/route";

describe("YouTube OAuth connect intent", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.APP_URL = "https://app.test"; mocks.maybeSingle.mockResolvedValue({ data:null, error:null }); mocks.encryptionState.mockReturnValue("configured"); });

  it("hands localhost to the styled canonical connection flow before Google", async () => {
    process.env.APP_URL = "https://audienceown.com";
    const response = await GET(new Request("http://localhost:3000/api/integrations/youtube/connect?role=official"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://audienceown.com/connect/provider?provider=youtube&role=official");
    expect(mocks.createState).not.toHaveBeenCalled();
  });

  it("rejects an invalid localhost role instead of carrying it across domains", async () => {
    process.env.APP_URL = "https://audienceown.com";
    const response = await GET(new Request("http://localhost:3000/api/integrations/youtube/connect?role=owner"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard/platforms?youtube=invalid_request");
    expect(mocks.createState).not.toHaveBeenCalled();
  });

  it("accepts the canonical browser origin when the server sees trusted ingress headers", async () => {
    process.env.APP_URL = "https://audienceown.com";
    const response = await GET(new Request("http://localhost:3000/api/integrations/youtube/connect", { headers:{ "x-forwarded-host":"audienceown.com", "x-forwarded-proto":"https" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://accounts.google.test/oauth");
  });

  it.each(["missing", "invalid_format"] as const)("fails before Google OAuth when token encryption is %s", async (state) => {
    mocks.encryptionState.mockReturnValueOnce(state);
    const response = await GET(new Request("https://app.test/api/integrations/youtube/connect"));
    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=not_configured");
    expect(mocks.createState).not.toHaveBeenCalled();
    expect(mocks.authorizationUrl).not.toHaveBeenCalled();
  });

  it("defaults new connections to the official role inside signed state", async () => {
    await GET(new Request("https://app.test/api/integrations/youtube/connect"));
    expect(mocks.createState).toHaveBeenCalledWith(expect.objectContaining({ creatorId:"creator-1", userId:"user-1", role:"official" }));
  });

  it("preserves a requested backup role inside signed state", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({data:{id:"official-1",account_type:"official"},error:null});
    await GET(new Request("https://app.test/api/integrations/youtube/connect?role=backup&protectedOfficialAccountId=official-1"));
    expect(mocks.createState).toHaveBeenCalledWith(expect.objectContaining({ role:"backup",protectedOfficialAccountId:"official-1" }));
  });

  it("allows a backup to be acquired before an official exists", async () => {
    await GET(new Request("https://app.test/api/integrations/youtube/connect?role=backup"));
    expect(mocks.createState).toHaveBeenCalledWith(expect.objectContaining({role:"backup"}));
  });

  it("signs an owned reconnect target only when its role matches", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data:{ id:"connection-1", account_type:"backup" }, error:null }).mockResolvedValueOnce({data:{id:"official-1",account_type:"official"},error:null});
    await GET(new Request("https://app.test/api/integrations/youtube/connect?role=backup&connectionId=connection-1&protectedOfficialAccountId=official-1"));
    expect(mocks.createState).toHaveBeenCalledWith(expect.objectContaining({ role:"backup", connectionId:"connection-1",protectedOfficialAccountId:"official-1" }));
  });

  it("rejects invalid, cross-creator, provider-mismatched, or role-mismatched reconnect targets", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data:null, error:null });
    const missing = await GET(new Request("https://app.test/api/integrations/youtube/connect?role=backup&connectionId=not-owned"));
    expect(missing.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=invalid_connection");
    mocks.maybeSingle.mockResolvedValueOnce({ data:{ id:"connection-1", account_type:"official" }, error:null });
    const wrongRole = await GET(new Request("https://app.test/api/integrations/youtube/connect?role=backup&connectionId=connection-1"));
    expect(wrongRole.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=invalid_connection");
    expect(mocks.createState).not.toHaveBeenCalled();
  });
});
