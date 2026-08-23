import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommunicationReviewContent } from "@/components/broadcast-studio/broadcast-studio";
import { alertComposerDefinitions, getAlertAudienceCopyDefinition, getIntentDefinition } from "@/lib/broadcast-studio";

const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");
const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
const normal = ["new_video","livestream","podcast_episode","product_release","event","general_announcement","community_update"] as const;

describe("shared alert composer architecture", () => {
  it("has one typed UI definition for every canonical alert intent", () => {
    expect(Object.keys(alertComposerDefinitions).sort()).toEqual([
      "account_banned","account_hacked","account_inaccessible","community_update","event","general_announcement","impersonation_warning","livestream","new_video","platform_migration","podcast_episode","product_release",
    ]);
  });

  it.each([
    ["new_video","Videos","Send video alert"],
    ["livestream","Livestreams","Send livestream alert"],
    ["podcast_episode","Videos","Send podcast alert"],
    ["product_release","Products","Send product update"],
    ["event","Announcements","Send event update"],
    ["general_announcement","Announcements","Send announcement"],
    ["community_update","Announcements","Send community update"],
  ] as const)("maps %s to its canonical preference and CTA", (intent, category, sendLabel) => {
    expect(alertComposerDefinitions[intent]).toMatchObject({ audienceLabel: category, sendLabel });
    expect(getIntentDefinition(intent).category).toBe(category.toLowerCase());
  });

  it.each(["account_hacked","account_banned","account_inaccessible","impersonation_warning","platform_migration"] as const)("keeps %s on mandatory Recovery Pass eligibility", (intent) => {
    expect(alertComposerDefinitions[intent].audienceLabel).toBe("Mandatory Recovery Pass");
    expect(getIntentDefinition(intent)).toMatchObject({ category:"recovery", mandatory:true });
  });

  it.each(normal)("renders %s through the shared premium review", (intent) => {
    const definition = alertComposerDefinitions[intent];
    const html = renderToStaticMarkup(<CommunicationReviewContent composer={definition} accounts={[]} audience={12} title="Alert title" subject="Draft subject" previewText="Draft preview" message="Canonical draft message" destination={definition.destinationMode === "optional" ? "" : "https://example.com/content"} ctaLabel={definition.destinationMode === "optional" ? "" : definition.ctaPlaceholder}/>);
    expect(html).toContain("new-video-review-card review-audience-card is-ready");
    expect(html).toContain(getAlertAudienceCopyDefinition(intent).preferenceLabel);
    expect(html).toContain("Canonical draft message");
  });

  it("omits fake verification UI for announcement-only updates", () => {
    for (const intent of ["general_announcement","community_update"] as const) {
      const html = renderToStaticMarkup(<CommunicationReviewContent composer={alertComposerDefinitions[intent]} accounts={[]} audience={3} title="News" subject="Subject" previewText="" message="Update" destination="" ctaLabel=""/>);
      expect(html).not.toContain("review-video-card");
    }
  });

  it("keeps type-safe wording out of unrelated alert definitions", () => {
    expect(JSON.stringify(alertComposerDefinitions.livestream)).not.toContain("video updates");
    expect(JSON.stringify(alertComposerDefinitions.product_release)).not.toContain("Watch video");
    expect(JSON.stringify(alertComposerDefinitions.account_inaccessible)).not.toContain("Send video alert");
  });

  it("uses one continue-to-review submit and no delivery call before final confirmation", () => {
    expect(studio.match(/name="continue_to_review"/g)).toHaveLength(1);
    const createBody = actions.slice(actions.indexOf("export async function createDraft"), actions.indexOf("export async function updateDraft"));
    expect(createBody).not.toContain("publishDeliveryQueue");
  });
});
