import {
  DEFAULT_RECOVERY_PREFERENCES,
  normalizeRecoveryPreferences,
  type RecoveryPreferences,
} from "@/lib/recovery-preferences";

export type PublicLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  action: "Follow" | "Subscribe" | "Visit" | "Join";
};

export type RecoveryDestination = {
  label: string;
  url: string;
  handle?: string;
};

export type PublicAnnouncement = {
  title: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  publishedAt: string;
};

export type CreatorRecord = {
  handle: string;
  displayName: string;
  avatar?: string;
  bio?: string | null;
  bannerImagePath?: string | null;
  announcement?: PublicAnnouncement | null;
  verified: boolean;
  recoveryPassPublished: boolean;
  emergencyMode: boolean;
  affectedPlatform?: string;
  statusMessage?: string;
  lastVerifiedAt: string;
  recoveryCoreFans: number;
  officialLinks: PublicLink[];
  recoveryRoutes: Record<string, {
    primary: RecoveryDestination;
    fallback?: RecoveryDestination;
  }>;
};

export const FAN_STORAGE_KEY = "audienceown:recovery-passes";

export type SavedRecoveryPass = {
  method: string;
  contact: string;
  consent: boolean;
  memberNumber: number;
  savedAt: string;
  source?: string;
  preferences?: RecoveryPreferences;
  preferenceToken?: string;
  unsubscribeToken?: string;
};

export function hasSavedRecoveryPass(handle: string) {
  return Boolean(readSavedRecoveryPass(handle));
}

function readPassRecords() {
  try {
    return JSON.parse(localStorage.getItem(FAN_STORAGE_KEY) ?? "{}") as Record<string, SavedRecoveryPass>;
  } catch {
    return {};
  }
}

export function readSavedRecoveryPass(handle: string) {
  const record = readPassRecords()[handle.toLowerCase()];
  if (!record) return null;
  return {
    ...record,
    preferences: record.preferences
      ? normalizeRecoveryPreferences(record.preferences)
      : { ...DEFAULT_RECOVERY_PREFERENCES },
  };
}

export function saveRecoveryPass(handle: string, payload: SavedRecoveryPass) {
  const records = readPassRecords();
  records[handle.toLowerCase()] = {
    ...payload,
    preferences: normalizeRecoveryPreferences(payload.preferences),
  };
  localStorage.setItem(FAN_STORAGE_KEY, JSON.stringify(records));
}

export function updateSavedRecoveryPass(handle: string, values: Partial<SavedRecoveryPass>) {
  const records = readPassRecords();
  const current = records[handle.toLowerCase()];
  if (!current) return null;
  const next = {
    ...current,
    ...values,
    preferences: values.preferences
      ? normalizeRecoveryPreferences(values.preferences)
      : normalizeRecoveryPreferences(current.preferences),
  };
  records[handle.toLowerCase()] = next;
  localStorage.setItem(FAN_STORAGE_KEY, JSON.stringify(records));
  return next;
}

export function removeSavedRecoveryPass(handle: string) {
  const records = readPassRecords();
  delete records[handle.toLowerCase()];
  localStorage.setItem(FAN_STORAGE_KEY, JSON.stringify(records));
}
