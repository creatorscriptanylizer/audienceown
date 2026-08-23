import { describe, expect, it } from "vitest";
import { buildAudienceUpdatesSummary } from "@/lib/dashboard/audience-updates";

const now = new Date("2026-08-15T12:00:00.000Z");
const update = (patch: Record<string, unknown> = {}) => ({
  id: "update-1",
  broadcast_type: "new_content" as const,
  broadcast_intent: "new_video" as const,
  status: "queued" as const,
  title: "Studio tour",
  scheduled_for: null,
  sent_at: null,
  queued_at: "2026-08-14T09:00:00.000Z",
  updated_at: "2026-08-14T09:00:00.000Z",
  affected_platform_connection_id: "youtube-account",
  source_provider: null,
  ...patch,
});
const delivery = (patch: Record<string, unknown> = {}) => ({
  update_id: "update-1",
  contact_id: "fan-1",
  transport: "email" as const,
  status: "delivered",
  accepted_at: "2026-08-14T09:01:00.000Z",
  delivered_at: "2026-08-14T09:02:00.000Z",
  ...patch,
});

describe("Audience Updates dashboard summary", () => {
  it("counts sent broadcasts once and reached fans uniquely", () => {
    const result = buildAudienceUpdatesSummary({
      now,
      updates: [update()],
      deliveries: [delivery(), delivery({ contact_id: "fan-2" }), delivery({ contact_id: "fan-1", transport: "sms" })],
      platforms: [{ id: "youtube-account", platform: "youtube" }],
    });
    expect(result.updatesSent).toBe(1);
    expect(result.audienceReached).toBe(2);
    expect(result.recent[0]).toMatchObject({ sourcePlatform: "youtube", deliveredCount: 3, deliveryChannels: ["email", "sms"] });
  });

  it("uses only confirmed delivery timestamps for audience reached", () => {
    const result = buildAudienceUpdatesSummary({ now, updates: [update()], deliveries: [delivery({ status: "accepted", delivered_at: null })], platforms: [] });
    expect(result.updatesSent).toBe(1);
    expect(result.audienceReached).toBe(0);
    expect(result.openRate).toBeNull();
    expect(result.clickRate).toBeNull();
  });

  it("counts current drafts and future schedules and orders the next schedule", () => {
    const updates = [
      update({ id: "draft", status: "draft", updated_at: "2026-08-15T10:00:00.000Z", affected_platform_connection_id: null }),
      update({ id: "later", status: "scheduled", scheduled_for: "2026-08-18T12:00:00.000Z" }),
      update({ id: "next", status: "scheduled", scheduled_for: "2026-08-16T12:00:00.000Z", title: "Tomorrow" }),
      update({ id: "past", status: "scheduled", scheduled_for: "2026-08-14T12:00:00.000Z" }),
    ];
    const result = buildAudienceUpdatesSummary({ now, updates, deliveries: [], platforms: [] });
    expect(result.drafts).toBe(1);
    expect(result.scheduled).toBe(2);
    expect(result.nextScheduled).toMatchObject({ id: "next", title: "Tomorrow" });
  });

  it("uses explicit source metadata and never invents a platform", () => {
    const result = buildAudienceUpdatesSummary({
      now,
      updates: [update({ id: "explicit", affected_platform_connection_id: null, source_provider: "spotify" }), update({ id: "unknown", affected_platform_connection_id: null, source_provider: null })],
      deliveries: [delivery({ update_id: "explicit" }), delivery({ update_id: "unknown", contact_id: "fan-2" })],
      platforms: [],
    });
    expect(result.recent.find((row) => row.id === "explicit")?.sourcePlatform).toBe("spotify");
    expect(result.recent.find((row) => row.id === "unknown")?.sourcePlatform).toBeNull();
    expect(result.byPlatform).toEqual([{ provider: "spotify", count: 1 }]);
  });

  it("keeps recent history bounded and contains no recipient identity fields", () => {
    const updates = Array.from({ length: 8 }, (_, index) => update({ id: `update-${index}`, updated_at: `2026-08-${String(index + 1).padStart(2, "0")}T09:00:00.000Z` }));
    const result = buildAudienceUpdatesSummary({ now, updates, deliveries: [], platforms: [] });
    expect(result.recent).toHaveLength(3);
    expect(result.recent.map((row) => row.id)).toEqual(["update-7", "update-6", "update-5"]);
    expect(JSON.stringify(result)).not.toContain("contact_id");
    expect(JSON.stringify(result)).not.toContain("fan-");
  });

  it("uses dedicated recent rows while preserving full draft counts", () => {
    const updates = Array.from({ length: 8 }, (_, index) => update({ id: `all-${index}`, status: index < 4 ? "draft" : "queued" }));
    const recentUpdates = [
      update({ id: "aug-10", updated_at: "2026-08-10T09:00:00.000Z" }),
      update({ id: "aug-19", updated_at: "2026-08-19T09:00:00.000Z" }),
      update({ id: "aug-15", updated_at: "2026-08-15T09:00:00.000Z" }),
      update({ id: "aug-18", updated_at: "2026-08-18T09:00:00.000Z" }),
    ];
    const upcomingScheduled = [update({ id: "future-scheduled", status: "scheduled", scheduled_for: "2026-09-06T00:47:00.000Z" })];
    const result = buildAudienceUpdatesSummary({ now, updates, recentUpdates, upcomingScheduled, deliveries: [], platforms: [] });
    expect(result.drafts).toBe(4);
    expect(result.recent.map((row) => row.id)).toEqual(["aug-19", "aug-18", "aug-15"]);
    expect(result.scheduled).toBe(1);
    expect(result.nextScheduled?.id).toBe("future-scheduled");
  });
});
