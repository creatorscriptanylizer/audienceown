import { describe, expect, it } from "vitest";
import { createCreatorAccountProjection } from "@/lib/social-providers/creator-account-projection";

describe("shared creator account projection", () => {
  it("projects the same connected YouTube account for Platforms and Dashboard consumers", () => {
    const projection = createCreatorAccountProjection("creator-a", [{ id: "connection-private", platform: "youtube", account_type: "official", label: "Main channel", url: "https://youtube.com/@main", is_primary: true, connection_health: "healthy", provider_status: "ready" }], [], []);
    const platformsConnected = projection.some((account) => account.provider === "youtube" && account.connected);
    const dashboardMain = projection.find((account) => account.provider === "youtube" && account.role === "official" && account.connected);
    expect(platformsConnected).toBe(true);
    expect(dashboardMain).toMatchObject({ displayName: "Main channel", primary: true, connected: true });
    expect(JSON.stringify(projection)).not.toContain("connection-private");
  });

  it("keeps two accounts on one provider separate", () => {
    const projection = createCreatorAccountProjection("creator-a", [
      { id: "main", platform: "youtube", account_type: "official", label: "Main", url: null, is_primary: true, connection_health: "healthy" },
      { id: "backup", platform: "youtube", account_type: "backup", label: "Backup", url: null, connection_health: "healthy" },
    ], [], []);
    expect(projection).toHaveLength(2);
    expect(projection.map((account) => account.role)).toEqual(["official", "backup"]);
    expect(new Set(projection.map((account) => account.accountKey)).size).toBe(2);
  });

  it("does not treat an unavailable metric as a disconnected account", () => {
    const [account] = createCreatorAccountProjection("creator-a", [{ id: "youtube", platform: "youtube", account_type: "official", label: "Channel", url: null, connection_health: "healthy" }], [], []);
    expect(account).toMatchObject({ connected: true, verified: false });
  });
});
