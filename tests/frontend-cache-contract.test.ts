import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const runner = readFileSync("scripts/run-next-dev.mjs", "utf8");
const diagnostics = readFileSync("scripts/frontend-cache-diagnostics.mjs", "utf8");
const serviceWorker = readFileSync("public/service-worker.js", "utf8");

describe("frontend cache workflow", () => {
  it("keeps normal dev and provides isolated clean and webpack diagnostics", () => {
    expect(packageJson.scripts.dev).toBe("next dev");
    expect(packageJson.scripts["dev:clean"]).toContain("--clean");
    expect(packageJson.scripts["dev:webpack"]).toContain("--webpack");
    expect(runner).toContain('path.resolve(".next/dev")');
    expect(runner).not.toContain('rm(path.resolve(".next")');
  });

  it("discovers generated CSS without hashed filenames", () => {
    expect(diagnostics).toContain('file.endsWith(".css")');
    expect(diagnostics).not.toMatch(/chunks\/[a-zA-Z0-9_-]+\.css/);
  });

  it("does not let the push worker cache application assets", () => {
    expect(serviceWorker).not.toMatch(/addEventListener\s*\(\s*["']fetch["']/);
    expect(serviceWorker).not.toMatch(/\bcaches\s*\./);
  });
});
