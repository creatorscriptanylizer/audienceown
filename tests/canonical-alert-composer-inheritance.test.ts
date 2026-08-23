import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alertComposerDefinitions, getIntentDefinition } from "@/lib/broadcast-studio";

const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");
const newPage = readFileSync("app/dashboard/updates/new/page.tsx", "utf8");
const editPage = readFileSync("app/dashboard/updates/[id]/page.tsx", "utf8");
const normal = ["new_video", "livestream", "podcast_episode", "product_release", "event", "general_announcement", "community_update"] as const;

describe("canonical alert composer inheritance", () => {
  it("routes both new and persisted drafts through the one AlertComposer", () => {
    expect(studio).toContain("export function AlertComposer");
    expect(newPage).toContain("<AlertComposer");
    expect(editPage).toContain("<AlertComposer");
    expect(studio).not.toMatch(/function (Podcast|Livestream|Product|Event|Announcement|Community)Composer/);
  });

  it.each(normal)("drives %s through the same typed definition contract", (intent) => {
    expect(alertComposerDefinitions[intent]).toMatchObject({
      intent,
      titleFieldLabel: expect.any(String),
      showSubject: expect.any(Boolean),
      showPreviewText: expect.any(Boolean),
      destinationMode: expect.stringMatching(/required|optional|recovery/),
      sendLabel: expect.any(String),
      scheduleLabel: expect.any(String),
      reviewTitle: expect.any(String),
      accent: expect.any(String),
    });
  });

  it.each(normal)("gives %s the canonical shared context selector", (intent) => {
    expect(getIntentDefinition(intent).platform).toBe("optional");
    expect(alertComposerDefinitions[intent].contextHeading).toBeTruthy();
    expect(alertComposerDefinitions[intent].contextCopy).toContain("only be sent to");
    expect(alertComposerDefinitions[intent].contextCopy).toContain("followers who opted in");
  });

  it("adds optional context to announcements without changing their shared remaining steps", () => {
    for (const intent of ["general_announcement", "community_update"] as const) {
      expect(getIntentDefinition(intent).platform).toBe("optional");
      expect(alertComposerDefinitions[intent].contextHeading).toBeTruthy();
      expect(alertComposerDefinitions[intent].contextCopy).toContain("Recovery Pass followers");
      expect(alertComposerDefinitions[intent].destinationMode).toBe("optional");
      expect(alertComposerDefinitions[intent].showSubject).toBe(true);
      expect(alertComposerDefinitions[intent].showPreviewText).toBe(true);
    }
  });

  it("uses one shared implementation for steps, fields, destination, footer, review, preview, and schedule", () => {
    for (const marker of [
      "new-video-target-groups", "shared-alert-audience", "broadcast-message-fields",
      "studio-action-fields", "Continue to review", "CommunicationReviewContent",
      "AlertMessagePreview", "studio-schedule-fields", "FocusedEditor",
    ]) expect(studio).toContain(marker);
    expect(studio.match(/name="continue_to_review"/g)).toHaveLength(1);
    expect(studio.match(/className="broadcast-message-fields"/g)).toHaveLength(1);
    expect(studio.match(/className="studio-action-fields"/g)).toHaveLength(2);
  });

  it("keeps recovery communications on the same shell with their business-specific semantics", () => {
    for (const intent of ["account_inaccessible", "platform_migration"] as const) {
      expect(alertComposerDefinitions[intent].audienceLabel).toBe("Mandatory Recovery Pass");
      expect(alertComposerDefinitions[intent].destinationMode).toBe("recovery");
      expect(alertComposerDefinitions[intent].showSubject).toBe(true);
    }
  });

  it("keeps New Video's established field and action contract", () => {
    expect(alertComposerDefinitions.new_video).toMatchObject({
      titleFieldLabel: "Title",
      showSubject: false,
      showPreviewText: false,
      sendLabel: "Send video alert",
      scheduleLabel: "Schedule video alert",
      accent: "violet",
    });
  });
});
