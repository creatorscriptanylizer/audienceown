import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicAuthenticity } from "./server";
import type { AccountLookup } from "./network-types";
import { canonicalPublicOrigin, getPublicVerificationUrl } from "@/lib/canonical-public-url";

export class PublicLookupUnavailableError extends Error {}

const providerHosts: Record<string, string[]> = {
  youtube: ["youtube.com", "www.youtube.com"], twitch: ["twitch.tv", "www.twitch.tv"],
  instagram: ["instagram.com", "www.instagram.com"], tiktok: ["tiktok.com", "www.tiktok.com"],
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"], facebook: ["facebook.com", "www.facebook.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
  spotify: ["open.spotify.com"], pinterest: ["pinterest.com", "www.pinterest.com"],
  discord: ["discord.com", "discord.gg"], snapchat: ["snapchat.com", "www.snapchat.com"],
};

export function normalizeAccountUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("invalid_account_url");
  url.hostname = url.hostname.toLowerCase();
  url.pathname = `${url.pathname.replace(/\/+$/g, "")}/`;
  return url.toString();
}

export function providerForUrl(value: string) {
  const hostname = new URL(value).hostname.toLowerCase();
  return Object.entries(providerHosts).find(([, hosts]) => hosts.includes(hostname))?.[0] ?? null;
}

export function normalizeHandle(value: string) {
  const handle = value.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._-]{1,100}$/.test(handle)) throw new Error("invalid_handle");
  return handle;
}

export async function lookupOfficialAccount(input: { url?: string; provider?: string; handle?: string }): Promise<AccountLookup> {
  const db = createAdminClient();
  if (!db) throw new PublicLookupUnavailableError("lookup_database_unavailable");
  let query = db.from("creator_identity_accounts").select("creator_id,canonical_profile_url,provider,display_handle")
    .eq("verification_status", "verified").eq("official", true).eq("public_visible", true);
  let wantedUrl: string | null = null;
  let wantedHandle: string | null = null;
  if (input.url) {
    wantedUrl = normalizeAccountUrl(input.url);
    const provider = providerForUrl(wantedUrl);
    if (!provider) return { matched: false };
    query = query.eq("provider", provider);
  } else {
    const provider = input.provider?.toLowerCase();
    wantedHandle = input.handle ? normalizeHandle(input.handle) : null;
    if (!provider || !providerHosts[provider] || !wantedHandle) return { matched: false };
    query = query.eq("provider", provider).ilike("display_handle", wantedHandle);
  }
  const { data, error } = await query.limit(100);
  if (error) throw new PublicLookupUnavailableError("lookup_accounts_unavailable", { cause: error });
  const exact = (data ?? []).filter((row) => wantedUrl ? normalizeAccountUrl(row.canonical_profile_url) === wantedUrl : true);
  const creatorIds = [...new Set(exact.map((row) => row.creator_id))];
  if (creatorIds.length !== 1) return { matched: false, ...(creatorIds.length > 1 ? { ambiguous: true } : {}) };
  const { data: creator, error: creatorError } = await db.from("creators").select("public_slug,public_profile_enabled").eq("id", creatorIds[0]).maybeSingle();
  if (creatorError) throw new PublicLookupUnavailableError("lookup_creator_unavailable", { cause: creatorError });
  if (!creator?.public_profile_enabled || !creator.public_slug) return { matched: false };
  const result = await getPublicAuthenticity(creator.public_slug);
  if (result.status === "unavailable") throw new PublicLookupUnavailableError("public_authenticity_unavailable");
  if (result.status === "absent") return { matched: false };
  const record = result.data;
  if (record.authenticity.state === "verification_restricted") return { matched: false };
  const matches = record.accounts.filter((account) => wantedUrl
    ? normalizeAccountUrl(account.url) === wantedUrl
    : account.provider === input.provider?.toLowerCase() && normalizeHandle(account.handle ?? "") === wantedHandle);
  if (matches.length !== 1) return { matched: false, ...(matches.length > 1 ? { ambiguous: true } : {}) };
  const base = canonicalPublicOrigin();
  return {
    matched: true,
    creator: { slug: record.creator.slug, displayName: record.creator.displayName, verificationUrl: getPublicVerificationUrl(record.creator.slug) },
    account: { ...matches[0], status: "verified" },
    authenticity: { state: record.authenticity.state, label: record.authenticity.label },
    emergency: record.emergency,
    assertionUrl: record.assertion ? new URL(record.assertion.url, base).toString() : null,
  };
}
