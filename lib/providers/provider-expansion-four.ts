import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { z } from "zod";
import type { NormalizedSocialContent } from "@/lib/social-providers/types";

const hosts = {
  spotify: ["open.spotify.com"],
  snapchat: ["snapchat.com", "www.snapchat.com"],
  pinterest: ["pinterest.com", "www.pinterest.com", "pin.it"],
} as const;

export function canonicalExpansionFourUrl(provider: keyof typeof hosts, value: string) {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !hosts[provider].includes(url.hostname.toLowerCase() as never)) return null;
  url.hash = "";
  return url;
}

const manualSchema = z.object({ url: z.string().url(), title: z.string().trim().min(1).max(300), publishedAt: z.string().datetime() }).strict();
export function manualExpansionFourContent(provider: "spotify" | "snapchat" | "pinterest", value: unknown): NormalizedSocialContent | null {
  const parsed = manualSchema.safeParse(value); if (!parsed.success) return null;
  const url = canonicalExpansionFourUrl(provider, parsed.data.url); if (!url) return null;
  const path = url.pathname.replace(/\/+$/, "");
  const match = provider === "spotify" ? path.match(/^\/(artist|show|album|episode|track)\/([A-Za-z0-9]+)$/)
    : provider === "snapchat" ? path.match(/^\/(?:add\/([A-Za-z0-9._-]+)|spotlight\/([A-Za-z0-9_-]+))$/)
    : path.match(/^\/pin\/(\d+)$/);
  if (!match) return null;
  const objectId = provider === "spotify" ? `${match[1]}:${match[2]}` : (match[2] ?? match[1]);
  return { provider, externalObjectId: `manual:${objectId}`, objectType: provider === "spotify" ? (match[1] === "episode" ? "podcast_episode" : "audio_release") : provider === "pinterest" ? "pin" : "post", eventType: "published", title: parsed.data.title, description: null, canonicalUrl: url.toString(), thumbnailUrl: null, mediaUrls: [], sourcePublishedAt: parsed.data.publishedAt, scheduledStartAt: null, liveStatus: null, rawMetadata: { source: "manual_import", approvalRequired: true, automaticPublishing: false, ownershipEstablished: false, trustEligible: false } };
}

export function expansionFourAccess(value: string | undefined) { return ["submitted", "approved", "restricted", "rejected"].includes(value ?? "") ? value! : "not_configured"; }
export function classifyExpansionFourError(error: unknown) { const m = error instanceof Error ? error.message : ""; const code = m.includes("429") || m.includes("rate_limit") ? "rate_limited" : m.includes("401") || m.includes("revoked") ? "authentication_revoked" : m.includes("refresh") ? "token_refresh_failed" : m.includes("allowlist") ? "allowlist_required" : m.includes("scope") ? "scope_not_granted" : m.includes("authority") ? "asset_authority_missing" : m.includes("private") || m.includes("secret") ? "private_or_secret_asset" : m.includes("stable") ? "stable_identity_conflict" : m.includes("unsafe") ? "unsafe_remote_destination" : m.includes("not_found") ? "permanent_not_found" : "temporary_provider_failure"; return { code, retryable: code === "rate_limited" || code === "temporary_provider_failure" }; }

export const manualServiceCategories = ["social","video","audio","music","podcast","community","newsletter","membership","commerce","booking","portfolio","developer","application","website","other"] as const;
export const manualServiceInput = z.object({ serviceName: z.string().trim().min(1).max(100), category: z.enum(manualServiceCategories), canonicalUrl: z.string().url(), publicHandle: z.string().trim().max(100).optional(), displayName: z.string().trim().min(1).max(200) }).strict();
function unsafeIp(address: string) { if (isIP(address) === 4) { const p = address.split(".").map(Number); return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 || p[0] === 169 && p[1] === 254 || p[0] === 172 && p[1] >= 16 && p[1] <= 31 || p[0] === 192 && p[1] === 168 || p[0] === 100 && p[1] >= 64 && p[1] <= 127; } const a = address.toLowerCase(); return a === "::" || a === "::1" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe8") || a.startsWith("fe9") || a.startsWith("fea") || a.startsWith("feb"); }
export function normalizeManualServiceUrl(value: string) { let url: URL; try { url = new URL(value); } catch { throw new Error("unsafe_remote_destination"); } const host = url.hostname.toLowerCase(); if (url.protocol !== "https:" || url.username || url.password || url.port || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || unsafeIp(host)) throw new Error("unsafe_remote_destination"); url.hostname = host; url.hash = ""; return url; }
export async function assertPublicManualServiceHost(url: URL) { const addresses = await lookup(url.hostname, { all: true, verbatim: true }); if (!addresses.length || addresses.some(({ address }) => unsafeIp(address))) throw new Error("unsafe_remote_destination"); }
export function hashManualChallenge(token: string) { return createHash("sha256").update(token, "utf8").digest("hex"); }
export function matchesManualChallenge(token: string, expectedHash: string) { const actual = Buffer.from(hashManualChallenge(token), "hex"), expected = Buffer.from(expectedHash, "hex"); return actual.length === expected.length && timingSafeEqual(actual, expected); }
