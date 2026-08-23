import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlertAudienceInsight, CommunicationReviewContent } from "@/components/broadcast-studio/broadcast-studio";
import type { PlatformAccount } from "@/components/broadcast-studio/types";
import { alertComposerDefinitions, getAudienceRule, getIntentDefinition } from "@/lib/broadcast-studio";

const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");
const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
const main: PlatformAccount = { id:"main", platform:"youtube", label:"KwaMoon", account_type:"official", url:"https://youtube.com/@kwamoon", external_account_id:"channel-main", is_primary:true, is_public:true, position:0, connection_health:"healthy", provider_status:"ready" };
const recovery: PlatformAccount = { id:"recovery", platform:"tiktok", label:"NPA", account_type:"backup", url:"https://tiktok.com/@npa", external_account_id:"account-recovery", is_primary:false, is_public:true, position:1, connection_health:"healthy", provider_status:"ready" };
const intents = ["community_update", "general_announcement"] as const;

describe("announcement and community connected-account context", () => {
  it.each(intents)("enables the canonical optional Step 01 for %s", (intent) => {
    expect(getIntentDefinition(intent).platform).toBe("optional");
    expect(alertComposerDefinitions[intent].contextHeading).toBeTruthy();
    expect(alertComposerDefinitions[intent].contextCopy).toContain("Recovery Pass followers");
    expect(alertComposerDefinitions[intent]).toMatchObject({ destinationMode:"optional", reviewTitle: intent === "community_update" ? "Review your community update" : "Review your announcement" });
  });

  it("reuses one multi-select for Main and Recovery accounts", () => {
    expect(studio.match(/function accountContextCard/g)).toHaveLength(1);
    expect(studio).toContain("officialAccounts.map(accountContextCard)");
    expect(studio).toContain("recoveryAccounts.map(accountContextCard)");
    expect(studio).toContain('setSelectedAccountIds(current => checked ? current.filter(id => id !== account.id) : [...current, account.id])');
    expect(studio).toContain('name="selected_account_ids"');
  });

  it.each(intents)("keeps %s category consent while applying selected context", (intent) => {
    expect(getAudienceRule({ intent, affectedPlatformConnectionId:null })).toBe("category_followers");
    expect(getAudienceRule({ intent, affectedPlatformConnectionId:main.id })).toBe("category_followers");
    expect(studio).toContain('previewCommunicationAudience(intent, scopedAccountIds)');
    expect(actions).toContain("resolveCommunicationAudiencePreview(creator.id, intent, accountIds)");
  });

  it.each(intents)("shows persisted Main and Recovery context separately from the %s audience", (intent) => {
    const html = renderToStaticMarkup(<CommunicationReviewContent composer={alertComposerDefinitions[intent]} accounts={[main,recovery]} audience={25} title="News" subject="An update" previewText="Preview" message="Community news" destination="" ctaLabel=""/>);
    expect(html).toContain("Related accounts");
    expect(html).toContain("YouTube · KwaMoon");
    expect(html).toContain("TikTok · NPA");
    expect(html).toContain("MAIN");
    expect(html).toContain("RECOVERY");
    expect(html).toContain(">25<");
    expect(html).toContain("Recovery Pass followers can receive");
    expect(html).toContain("native followers are not delivery recipients");
  });

  it.each(intents)("labels selected %s accounts as context without changing the count", (intent) => {
    const withoutContext = renderToStaticMarkup(<AlertAudienceInsight alertType={intent} eligibleCount={25} selectedContextCount={0}/>);
    const withContext = renderToStaticMarkup(<AlertAudienceInsight alertType={intent} eligibleCount={25} selectedContextCount={2}/>);
    expect(withoutContext).toContain("25 Recovery Pass followers");
    expect(withContext).toContain("25 Recovery Pass followers");
    expect(withContext).toContain("provide context only");
  });
});
