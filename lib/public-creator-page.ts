import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CreatorRecord, PublicAnnouncement, PublicLink } from "@/lib/public-creators";

type JsonObject = Record<string, unknown>;

export type PublicCreatorUpdate = {
  id: string;
  title: string;
  content: string;
  ctaUrl: string | null;
  mediaUrl: string | null;
  sentAt: string;
};

export type PublicCreatorPage = {
  creator: CreatorRecord;
  bio: string | null;
  bannerImagePath: string | null;
  announcement: PublicAnnouncement | null;
  updates: PublicCreatorUpdate[];
};

export class PublicCreatorPageUnavailableError extends Error {
  constructor(message = "The public creator page service is unavailable.") {
    super(message);
    this.name = "PublicCreatorPageUnavailableError";
  }
}

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function string(value: unknown) {
  return typeof value === "string" ? value : null;
}

function requiredString(value: unknown, field: string) {
  const parsed = string(value);
  if (parsed === null) throw new PublicCreatorPageUnavailableError(`Invalid public creator page field: ${field}.`);
  return parsed;
}

function announcement(value: unknown): PublicAnnouncement | null {
  if (value === null) return null;
  const row = object(value);
  if (!row) throw new PublicCreatorPageUnavailableError("Invalid public creator announcement.");
  return {
    title: string(row.title),
    body: string(row.body),
    ctaLabel: string(row.ctaLabel),
    ctaUrl: string(row.ctaUrl),
    publishedAt: requiredString(row.publishedAt, "announcement.publishedAt"),
  };
}

function action(platform: string): PublicLink["action"] {
  if (platform === "youtube" || platform === "newsletter") return "Subscribe";
  if (platform === "website") return "Visit";
  if (platform === "discord") return "Join";
  return "Follow";
}

function parsePayload(value: unknown): PublicCreatorPage {
  const root = object(value);
  const profile = object(root?.profile);
  if (!root || !profile || !Array.isArray(root.links) || !Array.isArray(root.updates)) {
    throw new PublicCreatorPageUnavailableError("Invalid public creator page payload.");
  }

  const slug = requiredString(profile.slug, "profile.slug");
  const displayName = requiredString(profile.displayName, "profile.displayName");
  const updatedAt = requiredString(profile.updatedAt, "profile.updatedAt");
  const links = root.links.map((value, index) => {
    const row = object(value);
    if (!row) throw new PublicCreatorPageUnavailableError("Invalid public creator link.");
    const platform = requiredString(row.platform, `links.${index}.platform`);
    return {
      id: `${platform}-${index}`,
      platform,
      label: requiredString(row.label, `links.${index}.label`),
      url: requiredString(row.url, `links.${index}.url`),
      action: action(platform),
    } satisfies PublicLink;
  });

  const updates = root.updates.map((value, index) => {
    const row = object(value);
    if (!row) throw new PublicCreatorPageUnavailableError("Invalid public creator update.");
    return {
      id: requiredString(row.id, `updates.${index}.id`),
      title: requiredString(row.title, `updates.${index}.title`),
      content: requiredString(row.content, `updates.${index}.content`),
      ctaUrl: string(row.ctaUrl),
      mediaUrl: string(row.mediaUrl),
      sentAt: requiredString(row.sentAt, `updates.${index}.sentAt`),
    };
  });

  const emergency = root.emergency === null ? null : object(root.emergency);
  if (root.emergency !== null && !emergency) {
    throw new PublicCreatorPageUnavailableError("Invalid public creator emergency.");
  }
  const affected = emergency?.affected === null ? null : object(emergency?.affected);
  const replacement = emergency?.replacement === null ? null : object(emergency?.replacement);
  const affectedPlatform = affected ? requiredString(affected.provider, "emergency.affected.provider") : "Account";
  const replacementRoute = replacement ? {
    primary: {
      label: "Verified official backup",
      handle: string(replacement.displayHandle) ?? undefined,
      url: requiredString(replacement.canonicalProfileUrl, "emergency.replacement.canonicalProfileUrl"),
    },
  } : null;
  const publicAnnouncement = announcement(profile.announcement);

  return {
    creator: {
      handle: slug,
      displayName,
      avatar: string(profile.profileImagePath) ?? undefined,
      bio: string(profile.bio),
      bannerImagePath: string(profile.bannerImagePath),
      announcement: publicAnnouncement,
      verified: true,
      recoveryPassPublished: profile.recoveryPassEnabled === true,
      emergencyMode: emergency !== null,
      affectedPlatform: emergency ? affectedPlatform : undefined,
      statusMessage: emergency ? requiredString(emergency.message, "emergency.message") : undefined,
      lastVerifiedAt: emergency ? requiredString(emergency.updatedAt, "emergency.updatedAt") : updatedAt,
      recoveryCoreFans: 0,
      officialLinks: links.map((link) => link.platform.toLowerCase() === affectedPlatform.toLowerCase()
        ? { ...link, label: `Affected — ${link.label}` }
        : link),
      recoveryRoutes: replacementRoute ? { [affectedPlatform.toLowerCase()]: replacementRoute } : {},
    },
    bio: string(profile.bio),
    bannerImagePath: string(profile.bannerImagePath),
    announcement: publicAnnouncement,
    updates,
  };
}

export const getPublicCreatorPage = cache(async (slug: string): Promise<PublicCreatorPage | null> => {
  const supabase = await createClient();
  if (!supabase) throw new PublicCreatorPageUnavailableError();
  const { data, error } = await supabase.rpc("get_public_creator_page", { p_slug: slug });
  if (error) throw new PublicCreatorPageUnavailableError();
  return data === null ? null : parsePayload(data);
});
