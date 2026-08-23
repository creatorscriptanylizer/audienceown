import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient:mocks.createClient }));

describe("optional viewer lookup", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createClient.mockReset();
    mocks.getUser.mockReset();
    mocks.createClient.mockResolvedValue({ auth:{ getUser:mocks.getUser } });
  });

  it("returns null only when Supabase reports that no auth session exists", async () => {
    mocks.getUser.mockResolvedValue({ data:{ user:null }, error:new AuthSessionMissingError() });
    const { getOptionalViewer } = await import("@/lib/dal");
    await expect(getOptionalViewer()).resolves.toBeNull();
  });

  it("retains genuine auth backend failures", async () => {
    const backendError = Object.assign(new Error("fetch failed"), { name:"AuthRetryableFetchError" });
    mocks.getUser.mockResolvedValue({ data:{ user:null }, error:backendError });
    const { getOptionalViewer } = await import("@/lib/dal");
    await expect(getOptionalViewer()).rejects.toMatchObject({ message:"viewer_lookup_unavailable", cause:backendError });
  });

  it("does not report missing auth configuration as a logged-out viewer", async () => {
    mocks.createClient.mockResolvedValue(null);
    const { getOptionalViewer } = await import("@/lib/dal");
    await expect(getOptionalViewer()).rejects.toThrow("viewer_lookup_unavailable");
  });
});
