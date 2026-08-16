import { z } from "zod";
import type { NormalizedSocialContent, ProviderReviewStatus } from "@/lib/social-providers/types";

const hostnames = {
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
} as const;

export function canonicalExpansionThreeUrl(provider: keyof typeof hostnames, value: string) {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || !hostnames[provider].includes(url.hostname.toLowerCase() as never)) return null;
  url.hash = "";
  return url;
}

const manualSchema = z.object({ url: z.string().url(), title: z.string().trim().min(1).max(300), publishedAt: z.string().datetime() }).strict();

export function manualExpansionThreeContent(provider: "x" | "linkedin", value: unknown): NormalizedSocialContent | null {
  const parsed = manualSchema.safeParse(value);
  if (!parsed.success) return null;
  const url = canonicalExpansionThreeUrl(provider, parsed.data.url);
  if (!url) return null;
  const path = url.pathname.replace(/\/+$/, "");
  const objectId = provider === "x"
    ? path.match(/^\/[^/]+\/status\/(\d+)$/)?.[1]
    : path.match(/^\/(?:feed\/update\/urn:li:(?:activity|share):\d+|posts\/[^/]+)$/)?.[0];
  if (!objectId) return null;
  return { provider, externalObjectId: `manual:${objectId}`, objectType: "post", eventType: "published", title: parsed.data.title, description: null, canonicalUrl: url.toString(), thumbnailUrl: null, mediaUrls: [], sourcePublishedAt: parsed.data.publishedAt, scheduledStartAt: null, liveStatus: null, rawMetadata: { source: "manual_import", approvalRequired: true, automaticPublishing: false, ownershipEstablished: false, trustEligible: false } };
}

export function expansionReview(value: string | undefined): ProviderReviewStatus {
  return value === "approved" || value === "submitted" || value === "restricted" || value === "rejected" ? value : value === "required" ? "required" : "not_configured";
}

export function classifyExpansionThreeError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = message.includes("429") || message.includes("rate_limit") ? "rate_limited" : message.includes("revoked") || message.includes("401") ? "authentication_revoked" : message.includes("scope") ? "scope_not_granted" : message.includes("entitlement") || message.includes("tier") ? "product_not_entitled" : message.includes("authority") || message.includes("role") ? "asset_authority_missing" : message.includes("did_conflict") || message.includes("stable") ? "stable_identity_conflict" : message.includes("not_found") ? "permanent_not_found" : "temporary_provider_failure";
  return { code, retryable: ["rate_limited", "temporary_provider_failure"].includes(code) };
}
