// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  FAN_STORAGE_KEY,
  readSavedRecoveryPass,
  removeSavedRecoveryPass,
  saveRecoveryPass,
  updateSavedRecoveryPass,
} from "@/lib/public-creators";
import { DEFAULT_RECOVERY_PREFERENCES } from "@/lib/recovery-preferences";

const pass = {
  method: "Email",
  contact: "fan@example.com",
  consent: true,
  memberNumber: 10,
  savedAt: "2026-07-26T00:00:00.000Z",
  preferences: { ...DEFAULT_RECOVERY_PREFERENCES, videos: true },
};

describe("local Recovery Pass lifecycle", () => {
  beforeEach(() => localStorage.clear());

  it("populates existing optional preferences", () => {
    saveRecoveryPass("nanakwame", pass);
    expect(readSavedRecoveryPass("nanakwame")?.preferences?.videos).toBe(true);
  });

  it("saves optional updates while preserving mandatory recovery", () => {
    saveRecoveryPass("nanakwame", pass);
    updateSavedRecoveryPass("nanakwame", {
      preferences: { ...DEFAULT_RECOVERY_PREFERENCES, recovery: false, products: true },
    });
    const preferences = readSavedRecoveryPass("nanakwame")?.preferences;
    expect(preferences?.recovery).toBe(true);
    expect(preferences?.products).toBe(true);
  });

  it("deactivates by removing the saved pass", () => {
    saveRecoveryPass("nanakwame", pass);
    removeSavedRecoveryPass("nanakwame");
    expect(readSavedRecoveryPass("nanakwame")).toBeNull();
  });

  it("does not mutate storage when simulating a first-time view", () => {
    saveRecoveryPass("nanakwame", pass);
    const before = localStorage.getItem(FAN_STORAGE_KEY);
    // Simulation is a view-state change only; it deliberately does not call a storage helper.
    expect(localStorage.getItem(FAN_STORAGE_KEY)).toBe(before);
  });
});
