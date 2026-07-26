import { describe, expect, it } from "vitest";
import {
  DEFAULT_RECOVERY_PREFERENCES,
  isValidRecoveryContact,
  normalizeRecoveryPreferences,
  parseActiveRecoveryPreferences,
  RECOVERY_CATEGORY_KEYS,
} from "@/lib/recovery-preferences";

describe("Recovery Pass preferences", () => {
  it("always enables recovery for normalized active passes", () => {
    expect(normalizeRecoveryPreferences({ recovery: false, videos: true })).toEqual({
      ...DEFAULT_RECOVERY_PREFERENCES,
      videos: true,
    });
  });

  it("rejects crafted requests that disable recovery", () => {
    expect(() => parseActiveRecoveryPreferences({
      ...DEFAULT_RECOVERY_PREFERENCES,
      recovery: false,
    })).toThrow();
  });

  it("rejects invalid category names", () => {
    expect(() => parseActiveRecoveryPreferences({
      ...DEFAULT_RECOVERY_PREFERENCES,
      marketing: true,
    })).toThrow();
  });

  it("allows every optional category to be selected independently", () => {
    for (const category of RECOVERY_CATEGORY_KEYS.filter((key) => key !== "recovery")) {
      const preferences = parseActiveRecoveryPreferences({
        ...DEFAULT_RECOVERY_PREFERENCES,
        [category]: true,
      });
      expect(preferences[category]).toBe(true);
      expect(preferences.recovery).toBe(true);
    }
  });

  it("validates email and mobile contact details", () => {
    expect(isValidRecoveryContact("Email", "fan@example.com")).toBe(true);
    expect(isValidRecoveryContact("Email", "not-an-email")).toBe(false);
    expect(isValidRecoveryContact("SMS", "+1 555 123 4567")).toBe(true);
    expect(isValidRecoveryContact("SMS", "123")).toBe(false);
  });
});
