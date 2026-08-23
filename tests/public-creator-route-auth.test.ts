import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("public creator route authentication", () => {
  it("uses the optional viewer lookup so signed-out visitors can enroll", () => {
    const source = readFileSync("app/c/[slug]/page.tsx", "utf8");

    expect(source).toContain("getOptionalViewer()");
    expect(source).toContain("getOptionalCreator()");
    expect(source).not.toContain("getViewer()");
    expect(source).not.toContain("getCreator()");
    expect(source).not.toContain('from("creators")');
  });
});
