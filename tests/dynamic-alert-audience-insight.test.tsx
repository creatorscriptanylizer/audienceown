import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlertAudienceInsight, CommunicationReviewContent } from "@/components/broadcast-studio/broadcast-studio";
import { alertAudienceCopyDefinitions, alertComposerDefinitions, getIntentDefinition, type BroadcastIntent } from "@/lib/broadcast-studio";

const normal: BroadcastIntent[] = ["new_video", "livestream", "podcast_episode", "product_release", "event", "general_announcement", "community_update"];

const insight = (intent: BroadcastIntent, eligibleCount: number | null, selectedContextCount = 0) => renderToStaticMarkup(
  <AlertAudienceInsight alertType={intent} eligibleCount={eligibleCount} selectedContextCount={selectedContextCount}/>,
);

describe("type-aware server-grounded alert audience insights", () => {
  it("preserves the canonical backend preference mapping", () => {
    expect(getIntentDefinition("new_video").category).toBe("videos");
    expect(getIntentDefinition("podcast_episode").category).toBe("videos");
    expect(getIntentDefinition("livestream").category).toBe("livestreams");
    expect(getIntentDefinition("product_release").category).toBe("products");
    for (const intent of ["event", "general_announcement", "community_update"] as const) expect(getIntentDefinition(intent).category).toBe("announcements");
    for (const intent of ["account_inaccessible", "platform_migration"] as const) expect(getIntentDefinition(intent)).toMatchObject({ category: "recovery", mandatory: true });
  });

  it.each(normal)("renders %s with its exact positive count and recipient noun", (intent) => {
    const html = insight(intent, 12, 1);
    expect(html).toContain("12 Recovery Pass followers are currently eligible");
    expect(html).toContain(alertAudienceCopyDefinitions[intent].recipientNoun);
    if (alertAudienceCopyDefinitions[intent].selectedContextCopy) expect(html).toContain(alertAudienceCopyDefinitions[intent].selectedContextCopy!);
  });

  it.each(normal)("renders the configured zero insight for %s", (intent) => {
    expect(insight(intent, 0)).toContain(alertAudienceCopyDefinitions[intent].zeroInsight);
  });

  it("uses Podcast-specific product language over its internal Videos mapping", () => {
    const html = insight("podcast_episode", 7, 2);
    expect(html).toContain("episode alert");
    expect(html).toContain("where the episode is available");
    expect(html).not.toContain("Videos preference");
    expect(html).not.toContain("video alert");
    expect(html).not.toContain("livestream");
    expect(html).not.toContain("product updates");
  });

  it("does not mention selected accounts when optional context is empty", () => {
    expect(insight("livestream", 37, 0)).not.toContain("selected accounts");
    expect(insight("livestream", 37, 2)).toContain("selected accounts");
  });

  it("uses distinct Livestream, Product, Event, Announcement, and Community language", () => {
    expect(insight("livestream", 3)).toContain("livestream alert");
    expect(insight("product_release", 3)).toContain("product update");
    expect(insight("event", 3)).toContain("event alert");
    expect(alertAudienceCopyDefinitions.general_announcement.optInCopy).toContain("announcements");
    expect(alertAudienceCopyDefinitions.community_update.optInCopy).toContain("community or announcement updates");
  });

  it("keeps recovery communications out of preference-based wording", () => {
    expect(insight("account_inaccessible", 4, 1)).toContain("recovery alert");
    expect(insight("platform_migration", 4, 1)).toContain("migration alert");
    expect(alertAudienceCopyDefinitions.account_inaccessible.optInCopy).toContain("emergency communication rules");
    expect(alertAudienceCopyDefinitions.platform_migration.optInCopy).toContain("migration communication rules");
  });

  it("uses type-aware language throughout Step 05 review", () => {
    const html = renderToStaticMarkup(<CommunicationReviewContent composer={alertComposerDefinitions.podcast_episode} accounts={[]} audience={5} title="Episode" subject="Subject" previewText="Preview" message="Message" destination="https://example.com/episode" ctaLabel="Listen"/>);
    expect(html).toContain("Podcast updates");
    expect(html).toContain("episode alert");
    expect(html).not.toContain("Videos preference");
  });

  it("uses type-aware final zero-result headings from the server action", () => {
    const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
    expect(actions).toContain("const audienceCopy = getAlertAudienceCopyDefinition(values.broadcast_intent)");
    expect(actions).toContain("audienceCopy.zeroResultHeading");
    expect(alertAudienceCopyDefinitions.podcast_episode.zeroResultHeading).toContain("podcast updates");
    expect(alertAudienceCopyDefinitions.livestream.zeroResultHeading).toContain("livestream updates");
  });
});
