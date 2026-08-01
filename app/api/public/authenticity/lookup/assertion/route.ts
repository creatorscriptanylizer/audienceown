import { createAdminClient } from "@/lib/supabase/admin";
import { lookupOfficialAccount, normalizeAccountUrl, providerForUrl } from "@/lib/authenticity/lookup";
import { authenticityRateLimit } from "@/lib/authenticity/rate-limit";
import { publicBaseUrl } from "@/lib/authenticity/public";
import { signPortablePayload, signingConfig } from "@/lib/authenticity/signing";
import type { AccountStatusPayload } from "@/lib/authenticity/network-types";

export async function GET(request: Request) {
  if (!authenticityRateLimit(`signed-lookup:${request.headers.get("x-forwarded-for") ?? "anonymous"}`, 10)) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  const query = new URL(request.url).searchParams;
  const raw = query.get("url");
  if (!raw) return Response.json({ error: "Canonical account URL required" }, { status: 400 });
  try {
    const accountUrl = normalizeAccountUrl(raw);
    const provider = providerForUrl(accountUrl);
    if (!provider) return Response.json({ error: "Unsupported provider" }, { status: 400 });
    const result = await lookupOfficialAccount({ url: accountUrl });
    const expected = query.get("creator");
    const matched = result.matched && (!expected || result.creator?.slug === expected);
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60_000);
    const payload: AccountStatusPayload = {
      version: "audienceown-account-status-v1", issuer: publicBaseUrl(), subject: { accountUrl, provider }, matched,
      creator: matched && result.creator ? { slug: result.creator.slug, verificationUrl: result.creator.verificationUrl } : null,
      status: { official: Boolean(matched && result.account?.official), primary: Boolean(matched && result.account?.primary), verificationState: matched ? "verified" : "unverified", authenticityState: matched && result.authenticity ? result.authenticity.state : "identity_unverified" },
      issuedAt: now.toISOString(), expiresAt: expires.toISOString(),
    };
    const config = signingConfig();
    const db = createAdminClient();
    const { data: activeKey } = config && db ? await db.from("authenticity_signing_keys").select("key_id").eq("key_id", config.keyId).eq("active", true).is("revoked_at", null).maybeSingle() : { data: null };
    const signed = activeKey && config ? signPortablePayload(payload, "audienceown-account-status+jws", config) : null;
    return signed
      ? Response.json(signed, { headers: { "cache-control": "no-store" } })
      : Response.json({ signed: false, payload, error: "Signing unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Invalid lookup" }, { status: 400 }); }
}
