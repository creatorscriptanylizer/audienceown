import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Settings AI UI removal", () => {
  it("does not load or render AI settings from the Settings overview", () => {
    const settings = readFileSync("app/dashboard/settings/page.tsx", "utf8");
    expect(settings).not.toContain("AiSettingsPanel");
    expect(settings).not.toContain("creator_ai_settings");
    expect(settings).not.toContain("get_ai_usage_summary");
    expect(settings).not.toContain("AI-assisted drafts");
    expect(settings).not.toContain("DRAFT INTELLIGENCE");
    expect(settings).not.toContain("Save AI settings");
  });
});
