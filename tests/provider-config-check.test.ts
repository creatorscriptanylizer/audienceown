import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync("scripts/provider-config-check.mjs", "utf8");
const env = readFileSync(".env.example", "utf8");

describe("provider configuration check", () => {
  it("covers every operator-runbook provider without printing values", () => {
    for (const provider of ["YouTube", "Instagram", "Facebook", "TikTok", "X", "Twitch", "Pinterest", "Discord", "LinkedIn", "Spotify", "Snapchat"]) {
      expect(script).toContain(`["${provider}"`);
    }
    expect(script).not.toMatch(/console\.log\([^)]*process\.env/);
  });

  it("keeps required provider variables unique in the template", () => {
    const required = [...script.matchAll(/"([A-Z][A-Z0-9_]+)"/g)].map((match) => match[1]).filter((name) => name.includes("_") && !name.endsWith("unavailable"));
    for (const name of new Set(required)) expect(env.match(new RegExp(`^${name}=`, "gm")) ?? []).toHaveLength(1);
  });
});
