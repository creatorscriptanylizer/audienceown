import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteCookie: vi.fn(),
  exchangeYouTubeCode: vi.fn(),
  verifyYouTubeOAuthState: vi.fn(),
  getYouTubeChannels: vi.fn(),
  encryptSocialSecret: vi.fn((value: string) => `encrypted:${value}`),
  revalidateCreatorAccounts: vi.fn(),
  removeCreatorConnectedAccount: vi.fn(async () => ({ status: "disconnected" as const })),
  rpc: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({
  get: () => ({ value: "oauth-nonce" }),
  delete: mocks.deleteCookie,
})) }));
vi.mock("@/lib/dal", () => ({
  getViewer: vi.fn(async () => ({ id: "user-1" })),
  getCreator: vi.fn(async () => ({ id: "creator-1" })),
}));
vi.mock("@/lib/youtube-oauth", () => ({
  YOUTUBE_READONLY_SCOPE: "https://www.googleapis.com/auth/youtube.readonly",
  exchangeYouTubeCode: mocks.exchangeYouTubeCode,
  verifyYouTubeOAuthState: mocks.verifyYouTubeOAuthState,
}));
vi.mock("@/lib/youtube-watcher", () => ({ getYouTubeChannels: mocks.getYouTubeChannels }));
vi.mock("@/lib/social-secrets", () => ({
  encryptSocialSecret: mocks.encryptSocialSecret,
  socialTokenEncryptionState: () => "configured" as const,
}));
vi.mock("@/lib/social-providers/creator-account-revalidation", () => ({
  revalidateCreatorAccounts: mocks.revalidateCreatorAccounts,
}));
vi.mock("@/lib/connected-account-removal", () => ({
  removeCreatorConnectedAccount: mocks.removeCreatorConnectedAccount,
}));

const admin = vi.hoisted(() => {
  function query(result: unknown) {
    const chain = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain), limit: vi.fn(() => chain), order: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => result), single: vi.fn(async () => result),
      then: vi.fn((resolve: (value: unknown) => unknown) => resolve(result)),
    };
    return chain;
  }
  const connectedLookup = query({ data: null });
  const secretLookup = query({ data: null });
  const connectionWrite = query({ data: { id: "connection-1" }, error: null });
  const insert = vi.fn(() => connectionWrite);
  const update = vi.fn(() => connectionWrite);
  const deleteConnection = vi.fn(() => connectionWrite);
  const secretUpsert = vi.fn(async () => ({ error: null }));
  const pendingInsert = vi.fn(async () => ({ error: null }));
  return {
    connectedLookup, secretLookup, connectionWrite, insert, update, deleteConnection, secretUpsert, pendingInsert,
    from: vi.fn((table: string) => {
      if (table === "connected_accounts") return {
        ...connectedLookup,
        insert,
        update,
        delete: deleteConnection,
      };
      if (table === "youtube_oauth_pending_selections") return { insert: pendingInsert };
      return { ...secretLookup, upsert: secretUpsert };
    }),
    rpc: mocks.rpc,
  };
});

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => admin }));

import { GET } from "@/app/api/integrations/youtube/callback/route";

describe("YouTube OAuth audience sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.connectedLookup.maybeSingle.mockReset().mockResolvedValue({data:null,error:null});
    process.env.APP_URL = "https://app.test";
    mocks.verifyYouTubeOAuthState.mockReturnValue({ userId: "user-1", creatorId: "creator-1", role:"official" });
    mocks.exchangeYouTubeCode.mockResolvedValue({
      access_token: "youtube-access", refresh_token: "youtube-refresh", expires_in: 3600,
      scope: "https://www.googleapis.com/auth/youtube.readonly", token_type: "Bearer",
    });
    mocks.getYouTubeChannels.mockResolvedValue([{
      id: "channel-1", title: "Creator channel", uploadsPlaylistId: "uploads-1",
      subscriberCount: "4321", hiddenSubscriberCount: false,
    }]);
    mocks.rpc.mockImplementation(async (name: string) => name === "upsert_provider_audience_metric"
      ? { data: "metric-1", error: null }
      : { data: true, error: null });
  });

  it.each([
    ["host", { "x-forwarded-host": "attacker.example" }],
    ["scheme", { "x-forwarded-proto": "http" }],
  ])("does not let hostile forwarded %s metadata override production APP_URL", async (_kind, headers) => {
    process.env.APP_URL = "https://audienceown.com";
    const response = await GET(new Request("http://localhost:3000/api/integrations/youtube/callback?code=code&state=state", {
      headers,
    }));

    expect(response.headers.get("location")).toBe("https://audienceown.com/dashboard/platforms?youtube=connected");
  });

  it("does not inherit an HTTPS localhost callback origin", async () => {
    process.env.APP_URL = "https://audienceown.com";
    const response = await GET(new Request("https://localhost:3000/api/integrations/youtube/callback?code=code&state=state"));

    expect(response.headers.get("location")).toBe("https://audienceown.com/dashboard/platforms?youtube=connected");
  });

  it("uses APP_URL for a cancelled onboarding callback", async () => {
    process.env.APP_URL = "https://audienceown.com";
    mocks.verifyYouTubeOAuthState.mockReturnValueOnce({ userId:"user-1", creatorId:"creator-1", role:"backup", returnTo:"onboarding" });
    const response = await GET(new Request("https://localhost:3000/api/integrations/youtube/callback?error=access_denied&state=state", {
      headers: {
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "http",
      },
    }));

    expect(response.headers.get("location")).toBe("https://audienceown.com/onboarding/accounts?step=backup&oauth=youtube:authorization_failed");
    expect(mocks.exchangeYouTubeCode).not.toHaveBeenCalled();
  });

  it("keeps explicit local-only APP_URL development redirects on HTTP localhost", async () => {
    process.env.APP_URL = "http://localhost:3000";
    const response = await GET(new Request("https://audienceown.com/api/integrations/youtube/callback?code=code&state=state", {
      headers: {
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      },
    }));

    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard/platforms?youtube=connected");
  });

  it("persists authenticated subscribers before redirecting so the dashboard does not await its first sync", async () => {
    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));

    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=connected");
    expect(mocks.getYouTubeChannels).toHaveBeenCalledWith("youtube-access");
    expect(mocks.rpc).toHaveBeenCalledWith("upsert_provider_audience_metric", expect.objectContaining({
      p_creator_id: "creator-1", p_connection_id: "connection-1", p_provider: "youtube",
      p_account_category:"official", p_count: 4321, p_unit: "subscribers", p_status: "available", p_approximate: true,
    }));
    expect(mocks.rpc).toHaveBeenCalledWith("append_provider_audience_snapshot", { p_metric_id: "metric-1" });
    expect(mocks.revalidateCreatorAccounts).toHaveBeenCalledWith("creator-1");
  });

  it("replaces a revoked credential-less Main without changing the healthy Backup", async () => {
    admin.connectedLookup.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => resolve({
      data: [{ id:"old-smart-money", connection_health:"revoked", provider_status:"configuration_pending", is_primary:true }],
      error:null,
    }));
    mocks.getYouTubeChannels.mockResolvedValueOnce([{
      id:"UC9ahqOvOtkQywRvgA9zRD9g", title:"KwaMoon", uploadsPlaylistId:"uploads-kwamoon",
      subscriberCount:"424", hiddenSubscriberCount:false,
    }]);

    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));

    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=connected");
    expect(mocks.removeCreatorConnectedAccount).toHaveBeenCalledWith(admin, "creator-1", "old-smart-money");
    expect(admin.insert).toHaveBeenCalledWith(expect.objectContaining({
      label:"KwaMoon", account_type:"official", is_primary:true,
      external_account_id:"UC9ahqOvOtkQywRvgA9zRD9g", connection_health:"healthy",
    }));
    expect(admin.secretUpsert).toHaveBeenCalledWith(expect.objectContaining({ platform_connection_id:"connection-1" }));
    expect(mocks.rpc).toHaveBeenCalledWith("upsert_provider_audience_metric", expect.objectContaining({
      p_connection_id:"connection-1", p_provider:"youtube", p_account_category:"official", p_count:424, p_unit:"subscribers",
    }));
    expect(admin.update).not.toHaveBeenCalledWith(expect.objectContaining({ account_type:"official" }));
  });

  it("removes a newly inserted connection when secret encryption fails", async () => {
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.encryptSocialSecret.mockImplementationOnce(() => { throw new Error("Social token encryption is not configured."); });

    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));

    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=connection_failed");
    expect(admin.insert).toHaveBeenCalled();
    expect(admin.deleteConnection).toHaveBeenCalled();
    expect(admin.secretUpsert).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    const output = diagnostic.mock.calls.flat().join(" ");
    expect(output).not.toContain("youtube-access");
    expect(output).not.toContain("youtube-refresh");
    diagnostic.mockRestore();
  });

  it("rejects invalid signed state before exchanging credentials", async () => {
    mocks.verifyYouTubeOAuthState.mockReturnValueOnce(null);
    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=invalid_state");
    expect(mocks.exchangeYouTubeCode).not.toHaveBeenCalled();
  });

  it("persists a backup connection without promoting it to primary", async () => {
    mocks.verifyYouTubeOAuthState.mockReturnValueOnce({ userId:"user-1", creatorId:"creator-1", role:"backup",protectedOfficialAccountId:"official-1" });
    admin.connectedLookup.maybeSingle.mockResolvedValueOnce({data:{id:"official-1"},error:null});
    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=connected");
    expect(admin.insert).toHaveBeenCalledWith(expect.objectContaining({ account_type:"backup", is_primary:false, external_account_id:"channel-1" }));
    expect(mocks.rpc).toHaveBeenCalledWith("upsert_provider_audience_metric", expect.objectContaining({ p_account_category:"backup" }));
  });

  it("persists an explicit hidden state without substituting zero", async () => {
    mocks.getYouTubeChannels.mockResolvedValueOnce([{ id: "channel-1", title: "Creator channel", uploadsPlaylistId: "uploads-1", subscriberCount: null, hiddenSubscriberCount: true }]);
    await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    expect(mocks.rpc).toHaveBeenCalledWith("upsert_provider_audience_metric", expect.objectContaining({
      p_count: null, p_status: "hidden",
    }));
  });

  it("returns a clear no-channel state for an empty provider collection", async () => {
    mocks.getYouTubeChannels.mockResolvedValueOnce([]);
    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=no_channel");
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it("stores multiple channels server-side and redirects with only an opaque selection id", async () => {
    mocks.getYouTubeChannels.mockResolvedValueOnce([
      { id:"channel-1", title:"Main", uploadsPlaylistId:"uploads-1", subscriberCount:"10", hiddenSubscriberCount:false },
      { id:"channel-2", title:"Backup", uploadsPlaylistId:"uploads-2", subscriberCount:"20", hiddenSubscriberCount:false },
    ]);
    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("youtube")).toBe("select_channel");
    expect(location.searchParams.get("pendingSelectionId")).toMatch(/^[0-9a-f-]{36}$/);
    expect(location.toString()).not.toContain("youtube-access");
    expect(location.toString()).not.toContain("youtube-refresh");
    expect(admin.pendingInsert).toHaveBeenCalledWith(expect.objectContaining({
      access_token_ciphertext:"encrypted:youtube-access", refresh_token_ciphertext:"encrypted:youtube-refresh",
      eligible_channels:expect.arrayContaining([expect.objectContaining({ id:"channel-2" })]),
    }));
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it("blocks the same stable YouTube channel from being added twice", async () => {
    mocks.verifyYouTubeOAuthState.mockReturnValueOnce({ userId:"user-1", creatorId:"creator-1", role:"backup",protectedOfficialAccountId:"official-1" });
    admin.connectedLookup.maybeSingle.mockResolvedValueOnce({data:{id:"official-1"},error:null}).mockResolvedValueOnce({ data:{ id:"existing-channel" }, error:null });
    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=already_connected");
    expect(admin.insert).not.toHaveBeenCalled();
    expect(mocks.revalidateCreatorAccounts).not.toHaveBeenCalled();
  });

  it.each(["official", "backup"] as const)("reconnects an existing %s account without changing its role or creator preferences", async (role) => {
    mocks.verifyYouTubeOAuthState.mockReturnValueOnce({ userId:"user-1", creatorId:"creator-1", role, connectionId:"connection-1",...(role==="backup"?{protectedOfficialAccountId:"official-1"}:{}) });
    admin.connectedLookup.maybeSingle
      .mockResolvedValueOnce({ data:{ id:"connection-1", account_type:role, is_primary:role === "official", is_public:false, position:7, label:"Creator label", provider_metadata:{ retained:true }, external_account_id:"channel-1" }, error:null })
      .mockResolvedValueOnce({ data:{ id:"connection-1", account_type:role, is_public:false, provider_metadata:{ retained:true }, external_account_id:"channel-1" }, error:null })
      .mockResolvedValueOnce(role==="backup"?{data:{id:"official-1"},error:null}:{data:{id:"connection-1"},error:null})
      .mockResolvedValueOnce({ data:{ id:"connection-1" }, error:null });
    await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    expect(admin.insert).not.toHaveBeenCalled();
    expect(admin.update).toHaveBeenCalledWith(expect.not.objectContaining({ account_type:expect.anything(), is_primary:expect.anything(), is_public:expect.anything(), position:expect.anything(), label:expect.anything() }));
    expect(mocks.rpc).toHaveBeenCalledWith("upsert_provider_audience_metric", expect.objectContaining({ p_account_category:role }));
  });

  it("rejects an invalid or cross-creator reconnect target before exchanging the code", async () => {
    mocks.verifyYouTubeOAuthState.mockReturnValueOnce({ userId:"user-1", creatorId:"creator-1", role:"backup", connectionId:"not-owned" });
    admin.connectedLookup.maybeSingle.mockResolvedValueOnce({ data:null, error:null });
    const response = await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    expect(response.headers.get("location")).toBe("https://app.test/dashboard/platforms?youtube=invalid_state");
    expect(mocks.exchangeYouTubeCode).not.toHaveBeenCalled();
  });

  it("retains the encrypted refresh token when Google omits rotation", async () => {
    mocks.exchangeYouTubeCode.mockResolvedValueOnce({ access_token:"new-access", expires_in:3600, scope:"https://www.googleapis.com/auth/youtube.readonly", token_type:"Bearer" });
    admin.secretLookup.maybeSingle.mockResolvedValueOnce({ data:{ refresh_token_ciphertext:"encrypted:retained-refresh" }, error:null });
    await GET(new Request("https://app.test/api/integrations/youtube/callback?code=code&state=state"));
    expect(admin.secretUpsert).toHaveBeenCalledWith(expect.objectContaining({ refresh_token_ciphertext:"encrypted:retained-refresh" }));
  });
});
