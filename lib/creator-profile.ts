import { slugSchema } from "@/lib/validation";

export const SLUG_MAX_LENGTH = 40;

export type SlugSyncState = {
  slug: string;
  manuallyEdited: boolean;
};

export type SlugAvailability =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "reserved"; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string }
  | { status: "unchanged" };

export function slugifyDisplayName(displayName: string) {
  return displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function syncSlugWithDisplayName(state: SlugSyncState, displayName: string): SlugSyncState {
  if (state.manuallyEdited) return state;
  return { slug: slugifyDisplayName(displayName), manuallyEdited: false };
}

export function applyManualSlugEdit(value: string, displayName: string): SlugSyncState {
  if (value === "") {
    return { slug: slugifyDisplayName(displayName), manuallyEdited: false };
  }

  return {
    slug: value.toLowerCase().replaceAll("_", "-").slice(0, SLUG_MAX_LENGTH),
    manuallyEdited: true,
  };
}

export function applyRecoveryPassSlugEdit(value: string): SlugSyncState {
  return {
    slug: value.trim().toLowerCase().replaceAll("_", "-").slice(0, SLUG_MAX_LENGTH),
    manuallyEdited: true,
  };
}

export function localSlugAvailability(slug: string, savedSlug?: string | null): SlugAvailability {
  if (!slug) return { status: "idle" };
  if (savedSlug === slug) return { status: "unchanged" };

  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return {
      status: "invalid",
      message: parsed.error.issues[0]?.message ?? "Invalid URL",
    };
  }

  return { status: "checking" };
}

export function canSubmitCreatorForm(availability: SlugAvailability) {
  return availability.status === "available" || availability.status === "unchanged";
}
