import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production build engine", () => {
  it("uses the verified webpack path instead of the stalled Turbopack default", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.build).toBe("next build --webpack");
  });
});
