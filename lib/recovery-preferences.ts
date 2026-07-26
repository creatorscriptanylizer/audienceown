import { z } from "zod";

export const RECOVERY_CATEGORY_KEYS = [
  "recovery",
  "videos",
  "livestreams",
  "announcements",
  "products",
] as const;

export type RecoveryCategory = typeof RECOVERY_CATEGORY_KEYS[number];
export type RecoveryPreferences = Record<RecoveryCategory, boolean>;

export const DEFAULT_RECOVERY_PREFERENCES: RecoveryPreferences = {
  recovery: true,
  videos: false,
  livestreams: false,
  announcements: false,
  products: false,
};

const activePreferenceSchema = z.object({
  recovery: z.literal(true),
  videos: z.boolean(),
  livestreams: z.boolean(),
  announcements: z.boolean(),
  products: z.boolean(),
}).strict();

export function parseActiveRecoveryPreferences(value: unknown): RecoveryPreferences {
  return activePreferenceSchema.parse(value);
}

export function normalizeRecoveryPreferences(value: unknown): RecoveryPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_RECOVERY_PREFERENCES };
  const candidate = value as Record<string, unknown>;
  return {
    recovery: true,
    videos: candidate.videos === true,
    livestreams: candidate.livestreams === true,
    announcements: candidate.announcements === true,
    products: candidate.products === true,
  };
}

export function isValidRecoveryContact(method: string, value: string) {
  if (method === "Browser notification") return true;
  if (method === "Email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  return value.replace(/\D/g, "").length >= 7;
}
