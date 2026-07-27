import { describe, expect, it } from "vitest";
import {
  broadcastIntents,
  getAudienceRule,
  getIntentDefinition,
  intentDefinitions,
  intentFromBroadcastType,
} from "@/lib/broadcast-studio";

describe("broadcast studio domain", () => {
  it("defines every intent exactly once", () => {
    expect(intentDefinitions.map(({ intent }) => intent)).toEqual(broadcastIntents);
    expect(new Set(broadcastIntents).size).toBe(12);
  });

  it.each(["account_hacked", "account_banned", "account_inaccessible", "impersonation_warning", "platform_migration"] as const)(
    "makes %s mandatory and platform-scoped",
    (intent) => expect(getIntentDefinition(intent)).toMatchObject({
      mandatory: true, platform: "required",
      category: "recovery", broadcastType: "account_update",
    }),
  );

  it("keeps normal broadcasts preference-based", () => {
    for (const item of intentDefinitions.filter(({ group }) => group === "share")) {
      expect(item.mandatory).toBe(false);
      expect(item.category).not.toBe("recovery");
    }
  });

  it.each([
    ["account_hacked", null, "affected_platform"],
    ["account_banned", null, "affected_platform"],
    ["account_inaccessible", null, "affected_platform"],
    ["impersonation_warning", null, "affected_platform"],
    ["platform_migration", null, "affected_platform"],
    ["new_video", "platform-id", "platform_followers"],
    ["new_video", null, "category_followers"],
    ["livestream", "platform-id", "platform_followers"],
    ["livestream", null, "category_followers"],
    ["podcast_episode", null, "category_followers"],
    ["product_release", null, "category_followers"],
    ["event", null, "category_followers"],
    ["general_announcement", null, "category_followers"],
    ["community_update", null, "category_followers"],
  ] as const)("derives the audience for %s with platform %s", (intent, platform, expected) => {
    expect(getAudienceRule({
      intent,
      affectedPlatformConnectionId: platform,
    })).toBe(expected);
  });

  it("allows platform narrowing only for video and livestream sharing", () => {
    expect(getIntentDefinition("new_video").platform).toBe("optional");
    expect(getIntentDefinition("livestream").platform).toBe("optional");
    expect(getIntentDefinition("general_announcement").platform).toBe("none");
  });

  it("provides intent-specific publish actions and writing prompts", () => {
    expect(getIntentDefinition("account_hacked").action).toBe("Send Recovery Alert");
    expect(getIntentDefinition("new_video").placeholder).toContain("release");
    expect(getIntentDefinition("livestream").action).toContain("Livestream");
  });

  it("maps legacy update types safely", () => {
    expect(intentFromBroadcastType("account_update")).toBe("account_hacked");
    expect(intentFromBroadcastType("new_content")).toBe("new_video");
    expect(intentFromBroadcastType("announcement")).toBe("general_announcement");
  });
});
