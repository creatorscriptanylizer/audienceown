import { describe, expect, it } from "vitest";
import { normalizePhoneNumber } from "@/lib/phone-number";

describe("authoritative phone normalization", () => {
  it.each([
    ["+44 20 7946 0018", undefined, "+442079460018"],
    ["020 7946 0018", "GB", "+442079460018"],
    ["(415) 555-2671", "US", "+14155552671"],
    ["＋49 30 901820", undefined, "+4930901820"],
  ])("normalizes %s with country %s", (input, country, expected) => {
    expect(normalizePhoneNumber(input, country)).toMatchObject({ ok: true, e164: expected });
  });

  it.each([
    ["020 7946 0018", undefined, "country_required"],
    ["123", "US", "invalid_phone"],
    ["not a phone", "GB", "invalid_phone"],
  ])("rejects %s safely", (input, country, code) => {
    expect(normalizePhoneNumber(input, country)).toEqual({ ok: false, code });
  });

  it("returns only masked display metadata", () => {
    expect(normalizePhoneNumber("+14155552671")).toMatchObject({
      ok: true,
      masked: "•••• •••• 2671",
    });
  });
});
