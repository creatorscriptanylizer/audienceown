import { describe, expect, it } from "vitest";
import {
  combineScheduleLocalValue,
  formatScheduledDate,
  isValidTimeZone,
  validateScheduleInput,
} from "@/lib/scheduling";

describe("scheduling time zones", () => {
  it("combines canonical date and time fields without changing their local meaning", () => {
    expect(combineScheduleLocalValue("2026-08-20", "18:30")).toBe("2026-08-20T18:30");
    expect(combineScheduleLocalValue("", "18:30")).toBe("");
    expect(combineScheduleLocalValue("2026-08-20", "")).toBe("");
  });

  it("accepts the intended Berlin local clock time", () => {
    expect(validateScheduleInput({
      localValue: "2026-08-20T18:30",
      timeZone: "Europe/Berlin",
      isoValue: "2026-08-20T16:30:00.000Z",
    })).toBe("2026-08-20T16:30:00.000Z");
  });

  it("accepts a matching absolute instant and IANA local time", () => {
    expect(validateScheduleInput({
      localValue: "2026-08-14T18:30",
      timeZone: "Europe/London",
      isoValue: "2026-08-14T17:30:00.000Z",
    })).toBe("2026-08-14T17:30:00.000Z");
  });

  it("rejects invalid zones and mismatched local timestamps", () => {
    expect(isValidTimeZone("Not/A_Zone")).toBe(false);
    expect(validateScheduleInput({
      localValue: "2026-08-14T18:30",
      timeZone: "Europe/London",
      isoValue: "2026-08-14T18:30:00.000Z",
    })).toBeNull();
  });

  it("rejects a nonexistent daylight-saving local time", () => {
    expect(validateScheduleInput({
      localValue: "2026-03-29T01:30",
      timeZone: "Europe/London",
      isoValue: "2026-03-29T01:30:00.000Z",
    })).toBeNull();
  });

  it("rejects a nonexistent Berlin daylight-saving local time", () => {
    expect(validateScheduleInput({
      localValue: "2026-03-29T02:30",
      timeZone: "Europe/Berlin",
      isoValue: "2026-03-29T01:30:00.000Z",
    })).toBeNull();
  });

  it("formats confirmations in the selected creator time zone", () => {
    expect(formatScheduledDate("2026-08-14T17:30:00.000Z", "Europe/London"))
      .toContain("6:30");
  });
});
