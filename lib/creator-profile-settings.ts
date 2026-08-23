import { z } from "zod";

const cleanText = (maximum: number) => z.string().trim().min(1, "This field is required.").max(maximum).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Control characters are not allowed.");
const optionalText = (maximum: number) => z.string().trim().max(maximum).refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), "Control characters are not allowed.").transform((value) => value || null);

export const creatorProfileSettingsSchema = z.object({
  display_name: cleanText(100),
  public_tagline: optionalText(160),
  public_bio: optionalText(500),
}).strict();

export type CreatorProfileSettings = {
  recoveryPassName: string;
  displayName: string;
  slug: string;
  tagline: string | null;
  biography: string | null;
};

export type CreatorProfileSettingsState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"display_name" | "public_tagline" | "public_bio", string[]>>;
  saved?: CreatorProfileSettings;
};
