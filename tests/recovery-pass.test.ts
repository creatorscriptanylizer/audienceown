import { describe, expect, it } from "vitest";
import { normaliseSource, recoveryPassUrl, sourceLabel } from "@/lib/recovery-pass";

describe("Recovery Pass attribution", () => {
  it("accepts allow-listed sources", () => expect(normaliseSource("tiktok")).toBe("tiktok"));
  it("falls back to direct for missing or unsafe values", () => {
    expect(normaliseSource(undefined)).toBe("direct");
    expect(normaliseSource("tiktok<script>")).toBe("direct");
  });
  it("builds platform-specific links", () => {
    expect(recoveryPassUrl("https://audienceown.com/", "nana", "youtube"))
      .toBe("https://audienceown.com/c/nana?src=youtube");
    expect(recoveryPassUrl("https://audienceown.com", "nana"))
      .toBe("https://audienceown.com/c/nana");
  });
  it("uses readable platform labels", () => expect(sourceLabel("x")).toBe("X"));
});
