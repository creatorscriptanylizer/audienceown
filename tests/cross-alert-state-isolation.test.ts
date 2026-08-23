import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { initializeAlertComposerValues } from "@/components/broadcast-studio/broadcast-studio";
import { alertAudienceCopyDefinitions, alertComposerDefinitions, alertCtaDefaults } from "@/lib/broadcast-studio";

const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");

describe("cross-alert composer state isolation", () => {
  it.each([
    ["new_video", "Watch video"],
    ["livestream", "Watch live"],
    ["podcast_episode", "Listen now"],
    ["product_release", "View release"],
    ["event", "View event"],
    ["account_inaccessible", "Find me here"],
    ["platform_migration", "Find me here"],
  ] as const)("initializes %s with only its canonical CTA suggestion", (intent, ctaLabel) => {
    const values = initializeAlertComposerValues(intent);
    expect(values.ctaLabel).toBe(ctaLabel);
    expect(values.destination).toBe("");
  });

  it.each(["general_announcement", "community_update"] as const)("does not force a CTA for optional %s destinations", (intent) => {
    expect(initializeAlertComposerValues(intent).ctaLabel).toBe("");
    expect(alertComposerDefinitions[intent].ctaPlaceholder).toBe("Read more");
  });

  it("isolates Podcast → New Video → Livestream transitions", () => {
    expect(initializeAlertComposerValues("podcast_episode").ctaLabel).toBe("Listen now");
    expect(initializeAlertComposerValues("new_video").ctaLabel).toBe("Watch video");
    expect(initializeAlertComposerValues("livestream").ctaLabel).toBe("Watch live");
  });

  it("isolates Event → Product transitions", () => {
    expect(initializeAlertComposerValues("event").ctaLabel).toBe("View event");
    expect(initializeAlertComposerValues("product_release").ctaLabel).toBe("View release");
  });

  it("preserves exact creator fields when reopening the same persisted draft", () => {
    const values = initializeAlertComposerValues("podcast_episode", {
      title: "Creator title", subject: "Creator subject", preview_text: "Creator preview",
      content: "Creator message", cta_label: "Play episode", cta_url: "https://example.com/episode",
    });
    expect(values).toEqual({
      title: "Creator title", subject: "Creator subject", previewText: "Creator preview",
      message: "Creator message", ctaLabel: "Play episode", destination: "https://example.com/episode",
    });
  });

  it("starts a fresh Podcast with its canonical suggestion after a custom Podcast draft", () => {
    const persisted = initializeAlertComposerValues("podcast_episode", {
      title: "Episode", subject: "Subject", preview_text: "", content: "Message",
      cta_label: "Play episode", cta_url: "https://example.com/episode",
    });
    expect(persisted.ctaLabel).toBe("Play episode");
    expect(initializeAlertComposerValues("podcast_episode").ctaLabel).toBe("Listen now");
  });

  it("resets every ephemeral field through the canonical intent transition helper", () => {
    for (const setter of [
      "setPlatformId", "setSelectedAccountIds", "setTitle", "setSubject", "setPreviewText",
      "setBody", "setCtaLabel", "setCtaUrl", "setAudiencePreview", "setDeliveryMode",
      "setScheduleDate", "setScheduleTime", "setConfirmOpen", "setFinalConfirmOpen",
    ]) expect(studio.slice(studio.indexOf("function openChoice"), studio.indexOf("function closeForm"))).toContain(setter);
    expect(studio).toContain("initializeAlertComposerValues(next, persistedDraft)");
  });

  it("freezes both typed copy maps and each alert definition", () => {
    expect(Object.isFrozen(alertComposerDefinitions)).toBe(true);
    expect(Object.isFrozen(alertAudienceCopyDefinitions)).toBe(true);
    expect(Object.isFrozen(alertCtaDefaults)).toBe(true);
    for (const definition of Object.values(alertComposerDefinitions)) expect(Object.isFrozen(definition)).toBe(true);
    for (const definition of Object.values(alertAudienceCopyDefinitions)) expect(Object.isFrozen(definition)).toBe(true);
  });

  it("keeps review, verification, insight, send, and schedule wording definition-driven", () => {
    for (const marker of [
      "composer.verificationLabel", "composer.reviewTitle", "composer.sendLabel", "composer.scheduleLabel",
      "audienceCopy.preferenceLabel", "audienceCopy.recipientNoun",
    ]) expect(studio).toContain(marker);
  });
});
