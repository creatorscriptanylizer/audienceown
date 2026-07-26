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

export type CreatorRecord = {
  handle: string;
  displayName: string;
  avatar?: string;
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

export const CREATOR_STORAGE_KEY = "audienceown:creators";
export const FAN_STORAGE_KEY = "audienceown:recovery-passes";

export type SavedRecoveryPass = {
  method: string;
  contact: string;
  consent: boolean;
  memberNumber: number;
  savedAt: string;
  source?: string;
  preferences?: RecoveryPreferences;
};

export const DEMO_CREATORS: Record<string, CreatorRecord> = {
  nanakwame: {
    handle: "nanakwame",
    displayName: "Nana Kwame",
    verified: true,
    recoveryPassPublished: true,
    emergencyMode: false,
    lastVerifiedAt: "2026-07-26T10:30:00.000Z",
    recoveryCoreFans: 1842,
    officialLinks: [
      { id: "tiktok", platform: "TikTok", label: "@nanakwame", url: "https://tiktok.com/@nanakwame", action: "Follow" },
      { id: "youtube", platform: "YouTube", label: "@nanakwame", url: "https://youtube.com/@nanakwame", action: "Subscribe" },
      { id: "instagram", platform: "Instagram", label: "@nanakwame", url: "https://instagram.com/nanakwame", action: "Follow" },
      { id: "website", platform: "Website", label: "nanakwame.com", url: "https://nanakwame.com", action: "Visit" },
      { id: "discord", platform: "Discord", label: "Nana's Community", url: "https://discord.gg/nanakwame", action: "Join" },
      { id: "newsletter", platform: "Newsletter", label: "The Sunday Signal", url: "https://nanakwame.com/newsletter", action: "Subscribe" },
    ],
    recoveryRoutes: {
      tiktok: {
        primary: { label: "Backup TikTok", handle: "@nanakwamebackup", url: "https://tiktok.com/@nanakwamebackup" },
        fallback: { label: "Website", handle: "nanakwame.com", url: "https://nanakwame.com" },
      },
      youtube: {
        primary: { label: "Backup YouTube", handle: "@nanakwamebackup", url: "https://youtube.com/@nanakwamebackup" },
        fallback: { label: "Newsletter", handle: "The Sunday Signal", url: "https://nanakwame.com/newsletter" },
      },
    },
  },
  maya: {
    handle: "maya",
    displayName: "Maya Chen",
    verified: true,
    recoveryPassPublished: true,
    emergencyMode: true,
    affectedPlatform: "TikTok",
    statusMessage: "My main TikTok is temporarily unavailable. These are my only verified destinations.",
    lastVerifiedAt: "2026-07-26T12:45:00.000Z",
    recoveryCoreFans: 9264,
    officialLinks: [
      { id: "youtube", platform: "YouTube", label: "@mayamakes", url: "https://youtube.com/@mayamakes", action: "Subscribe" },
      { id: "instagram", platform: "Instagram", label: "@mayamakes", url: "https://instagram.com/mayamakes", action: "Follow" },
      { id: "discord", platform: "Discord", label: "Maya Makes Club", url: "https://discord.gg/mayamakes", action: "Join" },
      { id: "newsletter", platform: "Newsletter", label: "Maya's Field Notes", url: "https://maya.example/newsletter", action: "Subscribe" },
      { id: "website", platform: "Website", label: "maya.example", url: "https://maya.example", action: "Visit" },
    ],
    recoveryRoutes: {
      tiktok: {
        primary: { label: "Backup TikTok", handle: "@mayamakesbackup", url: "https://tiktok.com/@mayamakesbackup" },
        fallback: { label: "Official website", handle: "maya.example", url: "https://maya.example" },
      },
    },
  },
};

export function getDemoCreator(handle: string) {
  return DEMO_CREATORS[handle.toLowerCase()] ?? null;
}

export function readStoredCreator(handle: string): CreatorRecord | null {
  try {
    const records = JSON.parse(localStorage.getItem(CREATOR_STORAGE_KEY) ?? "{}") as Record<string, CreatorRecord>;
    return records[handle.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

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
