import { describe, expect, it } from "vitest";
import {
  broadcastPreferenceMap,
  broadcastTypeLabels,
  broadcastTypes,
  parseBroadcastTypeQuery,
  updateDraftSchema,
  updatePublishSchema,
} from "@/lib/updates";

const incompleteDraft = {
  broadcast_type: "announcement",
  title: "",
  subject: "",
  preview_text: "",
  content: "",
  cta_label: "",
  cta_url: "",
} as const;

describe("update domain", () => {
  it("labels every broadcast type", () => {
    expect(broadcastTypes.map((type) => broadcastTypeLabels[type])).toEqual([
      "New content",
      "Announcement",
      "Livestream",
      "Event",
      "Product launch",
      "Important account update",
    ]);
  });

  it("maps every broadcast type to its audience preference", () => {
    expect(broadcastTypes.map((type) => broadcastPreferenceMap[type])).toEqual([
      "videos",
      "announcements",
      "livestreams",
      "announcements",
      "products",
      "recovery",
    ]);
  });

  it("allows an incomplete draft", () => {
    expect(updateDraftSchema.safeParse(incompleteDraft).success).toBe(true);
  });

  it.each([
    ["title", 121],
    ["subject", 161],
    ["preview_text", 201],
  ] as const)("enforces the %s length limit", (field, length) => {
    expect(updateDraftSchema.safeParse({ ...incompleteDraft, [field]: "x".repeat(length) }).success).toBe(false);
  });

  it("requires HTTPS for a CTA URL when present", () => {
    expect(updateDraftSchema.safeParse({ ...incompleteDraft, cta_url: "http://example.com" }).success).toBe(false);
    expect(updateDraftSchema.safeParse({ ...incompleteDraft, cta_url: "https://example.com" }).success).toBe(true);
  });

  it("accepts complete publishable content", () => {
    expect(updatePublishSchema.safeParse({ ...incompleteDraft, title: "Weekly note", subject: "This week", content: "Hello." }).success).toBe(true);
  });

  it("rejects a publishable update without a subject", () => {
    expect(updatePublishSchema.safeParse({ ...incompleteDraft, title: "Weekly note", content: "Hello." }).success).toBe(false);
  });

  it("rejects a publishable update without content", () => {
    expect(updatePublishSchema.safeParse({ ...incompleteDraft, title: "Weekly note", subject: "This week" }).success).toBe(false);
  });

  it("preselects a valid account update query", () => {
    expect(parseBroadcastTypeQuery("account_update")).toBe("account_update");
  });

  it("falls back safely for an invalid update type query", () => {
    expect(parseBroadcastTypeQuery("anything_goes")).toBe("new_content");
  });
});
