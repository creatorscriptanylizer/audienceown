import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalProviderHandoffUrl, providerConnectIntent, providerConnectPath } from "@/lib/provider-connect-handoff";
import { oauthFoundationProviders } from "@/lib/social-providers/provider-registry";

const viewer = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dal", () => ({ getOptionalViewer:viewer }));
import { GET } from "@/app/connect/provider/route";

describe("canonical provider handoff", () => {
  beforeEach(() => { process.env.APP_URL="https://audienceown.com"; viewer.mockReset(); });

  it("allowlists providers and canonical roles", () => {
    expect(providerConnectIntent("youtube","official")).toEqual({provider:"youtube",role:"official"});
    expect(providerConnectIntent("youtube","backup")).toEqual({provider:"youtube",role:"backup"});
    expect(providerConnectIntent("unknown","official")).toBeNull();
    expect(providerConnectIntent("youtube","admin")).toBeNull();
    expect(providerConnectIntent("rss","official")).toBeNull();
    for (const provider of oauthFoundationProviders) {
      expect(providerConnectIntent(provider,"official")).toEqual({provider,role:"official"});
      expect(providerConnectIntent(provider,"backup")).toEqual({provider,role:"backup"});
    }
  });

  it("constructs only the configured canonical origin and fixed continuation", () => {
    expect(canonicalProviderHandoffUrl({provider:"youtube",role:"official"},"https://audienceown.com").toString()).toBe("https://audienceown.com/connect/provider?provider=youtube&role=official");
    expect(providerConnectPath({provider:"youtube",role:"official"})).toBe("/api/integrations/youtube/connect?role=official");
  });

  it("reauthenticates on the canonical domain without reusing localhost cookies", async () => {
    viewer.mockResolvedValue(null);
    const response=await GET(new Request("https://audienceown.com/connect/provider?provider=youtube&role=official"));
    expect(response.headers.get("location")).toBe("https://audienceown.com/login?next=%2Fconnect%2Fprovider%3Fprovider%3Dyoutube%26role%3Dofficial");
  });

  it.each(oauthFoundationProviders)("uses the same safe missing-session continuation for %s", async (provider) => {
    viewer.mockResolvedValue(null);
    const response=await GET(new Request(`https://audienceown.com/connect/provider?provider=${provider}&role=official`));
    expect(response.headers.get("location")).toBe(`https://audienceown.com/login?next=${encodeURIComponent(`/connect/provider?provider=${provider}&role=official`)}`);
  });

  it("does not treat an authentication backend failure as a logged-out viewer", async () => {
    viewer.mockRejectedValue(new Error("viewer_lookup_unavailable"));
    const response=await GET(new Request("https://audienceown.com/connect/provider?provider=youtube&role=official"));
    expect(response.headers.get("location")).toBe("https://audienceown.com/dashboard/platforms?connect=temporarily_unavailable");
  });

  it("automatically resumes an authenticated creator at the provider endpoint", async () => {
    viewer.mockResolvedValue({id:"canonical-user"});
    const response=await GET(new Request("https://audienceown.com/connect/provider?provider=youtube&role=backup"));
    expect(response.headers.get("location")).toBe("https://audienceown.com/api/integrations/youtube/connect?role=backup");
  });

  it("canonicalizes localhost and rejects foreign redirect input", async () => {
    const response=await GET(new Request("http://localhost:3000/connect/provider?provider=youtube&role=official&next=https://evil.test"));
    expect(response.headers.get("location")).toBe("https://audienceown.com/connect/provider?provider=youtube&role=official");
    const invalid=await GET(new Request("https://audienceown.com/connect/provider?provider=evil&role=official&next=https://evil.test"));
    expect(invalid.headers.get("location")).toBe("https://audienceown.com/dashboard/platforms?connect=invalid_request");
  });
});
