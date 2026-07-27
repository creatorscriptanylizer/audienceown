import { describe, expect, it } from "vitest";
import { broadcastChoices, emergencySubtypes, isAccountEmergency } from "@/components/broadcast-studio/broadcast-choices";
import { getIntentDefinition } from "@/lib/broadcast-studio";

describe("Broadcast Studio main choices", () => {
  it("shows broadcast types instead of workflow sections", () => {
    const titles = broadcastChoices.map(({ title }) => title);
    expect(titles).toContain("Account inaccessible");
    expect(titles).toContain("New video");
    expect(titles).not.toEqual(expect.arrayContaining(["Intent", "Platform", "Audience", "Message", "Action", "Review"]));
  });

  it("consolidates account emergencies into one main card", () => {
    expect(broadcastChoices.filter(({ group }) => group === "protect").map(({ title }) => title)).toEqual([
      "Account inaccessible",
      "Platform migration",
    ]);
    expect(broadcastChoices.map(({ title }) => title)).not.toEqual(expect.arrayContaining([
      "Account hacked",
      "Account banned or suspended",
      "Impersonation or security warning",
    ]));
  });

  it("offers all four account situations in the focused form", () => {
    expect(emergencySubtypes.map(({ label }) => label)).toEqual([
      "Account hacked",
      "Account banned or suspended",
      "Cannot access the account",
      "Impersonation or security warning",
    ]);
  });

  it.each(emergencySubtypes)("maps $label to a mandatory authoritative emergency intent", ({ value }) => {
    expect(isAccountEmergency(value)).toBe(true);
    expect(getIntentDefinition(value)).toMatchObject({
      mandatory: true,
      platform: "required",
      broadcastType: "account_update",
    });
  });

  it("keeps platform migration separate but mandatory", () => {
    expect(getIntentDefinition("platform_migration")).toMatchObject({
      mandatory: true,
      platform: "required",
    });
  });

  it("labels regular cards from the existing preference model", () => {
    expect(broadcastChoices.find(({ intent }) => intent === "new_video")?.delivery).toBe("Preference-based · Videos");
    expect(broadcastChoices.find(({ intent }) => intent === "podcast_episode")?.delivery).toBe("Preference-based · Videos");
    expect(broadcastChoices.find(({ intent }) => intent === "product_release")?.delivery).toBe("Preference-based · Products");
    expect(broadcastChoices.find(({ intent }) => intent === "event")?.delivery).toBe("Preference-based · Announcements");
  });

  it("never includes audience counts in static choice data", () => {
    expect(JSON.stringify(broadcastChoices)).not.toMatch(/\d[\d,]* eligible/);
  });
});
