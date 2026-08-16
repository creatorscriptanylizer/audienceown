import { z } from "zod";

/** Provider capability/configuration state, separate from OAuth connection health. */
export const providerStatuses = [
  "ready",
  "configuration_pending",
  "provider_review_required",
  "provider_plan_required",
  "automatic_detection_unavailable",
  "missing_approved_scope",
  "app_review_required",
  "asset_selection_required",
  "public_invite_required",
  "public_url_required",
  "reconnect_required",
] as const;

export const providerStatusSchema = z.enum(providerStatuses);
export type ProviderStatus = z.infer<typeof providerStatusSchema>;

export function oauthProviderStatus(input: {
  provider: string;
  detectionReady: boolean;
  reviewStatus: string;
  assetSelectionRequired?: boolean;
}): ProviderStatus {
  if (input.assetSelectionRequired) return "asset_selection_required";
  if (input.provider === "discord") return "public_invite_required";
  if (input.provider === "snapchat") return "public_url_required";
  if (input.provider === "linkedin" || input.detectionReady) return "ready";
  return input.reviewStatus === "approved" ? "automatic_detection_unavailable" : "app_review_required";
}
