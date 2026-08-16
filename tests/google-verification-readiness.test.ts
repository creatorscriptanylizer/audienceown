import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Google verification public surfaces", () => {
  it("keeps public policy links on the homepage and auth surface", () => {
    const homepage = readFileSync(resolve("app/page.tsx"), "utf8");
    const footer = readFileSync(resolve("components/public-footer.tsx"), "utf8");
    const auth = readFileSync(resolve("app/(auth)/layout.tsx"), "utf8");
    for (const href of ["/privacy", "/terms", "/data-deletion"]) {
      expect(`${homepage}${footer}`).toContain(href);
      expect(auth).toContain(href);
    }
  });

  it("contains no forbidden YouTube authorization scope literals in runtime source", () => {
    const files = ["lib/youtube-oauth.ts", "app/api/integrations/youtube/connect/route.ts", "app/api/integrations/youtube/callback/route.ts"];
    const source = files.map((file) => readFileSync(resolve(file), "utf8")).join("\n");
    expect(source).not.toContain("auth/youtube.upload");
    expect(source).not.toContain("auth/youtube.force-ssl");
    expect(source).not.toMatch(/auth\/youtube(?:[\"'])/);
  });
});
