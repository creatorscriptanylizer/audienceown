import { z } from "zod";

export const RESERVED_SLUGS = new Set([
  "admin", "api", "auth", "c", "dashboard", "login", "logout", "register",
  "settings", "support", "pricing", "about",
]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(40, "Use no more than 40 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens")
  .refine((value) => !RESERVED_SLUGS.has(value), "This URL is reserved");
export const handleSchema = slugSchema;

export const httpsUrlSchema = z.string().trim().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.hostname === "localhost");
}, "Use a secure HTTPS URL");

export const socialAccountSchema = z.object({
  id: z.string().uuid().optional(),
  platform: z.enum(["youtube","instagram","tiktok","x","facebook","twitch","discord","telegram","website","other"]),
  label: z.string().trim().min(1).max(60),
  url: httpsUrlSchema,
  account_type: z.enum(["official", "backup"]),
  is_public: z.boolean().default(true),
  is_primary: z.boolean().default(false),
  position: z.number().int().min(0).max(1000),
});

export const creatorSchema = z.object({
  public_slug: slugSchema,
  display_name: z.string().trim().min(1).max(80),
  public_bio: z.string().trim().max(500),
});

export const preferencesSchema = z.object({
  creator_announcements: z.boolean().default(true),
  new_content: z.boolean().default(true),
  important_account_updates: z.boolean().default(true),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(3000),
  cta_label: z.string().trim().max(40).optional().or(z.literal("")),
  cta_url: z.union([httpsUrlSchema, z.literal("")]).optional(),
});

export function normaliseEmail(value: string) {
  return value.trim().toLowerCase().normalize("NFKC");
}

export function safeCsvCell(value: string | null | undefined) {
  const raw = value ?? "";
  const protectedValue = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

export async function hashToken(token: string, secret = "") {
  const data = new TextEncoder().encode(`${secret}:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function profileCompletion(profile: {
  public_slug?: string | null; display_name?: string | null; public_bio?: string | null;
  profile_image_path?: string | null; banner_image_path?: string | null; social_count?: number;
}) {
  const checks = [
    profile.public_slug, profile.display_name, profile.public_bio, profile.profile_image_path,
    profile.banner_image_path, (profile.social_count ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function subscriberEligible(
  status: string,
  preferences: { creator_announcements: boolean },
) {
  return status === "active" && preferences.creator_announcements;
}
