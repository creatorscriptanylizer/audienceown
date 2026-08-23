import { PRODUCTION_APP_ORIGIN } from "@/lib/app-url";
import { oauthFoundationProviders } from "@/lib/social-providers/provider-registry";
import type { SocialProvider } from "@/lib/social-providers/types";

export type ProviderConnectRole = "official" | "backup";
export type ProviderConnectIntent = { provider: SocialProvider; role: ProviderConnectRole };
const CANONICAL_OAUTH_PROVIDERS = new Set<SocialProvider>(oauthFoundationProviders);

export function providerConnectIntent(provider: string | null | undefined, role: string | null | undefined): ProviderConnectIntent | null {
  if (!provider || !CANONICAL_OAUTH_PROVIDERS.has(provider as SocialProvider)) return null;
  if (role !== "official" && role !== "backup") return null;
  return { provider:provider as SocialProvider, role };
}

function intentQuery(intent: ProviderConnectIntent) {
  return new URLSearchParams(intent).toString();
}

export function canonicalProviderHandoffUrl(intent: ProviderConnectIntent, configuredOrigin?: string | null) {
  return new URL(`/connect/provider?${intentQuery(intent)}`, configuredOrigin ?? PRODUCTION_APP_ORIGIN);
}

export function providerConnectPath(intent: ProviderConnectIntent) {
  return `/api/integrations/${encodeURIComponent(intent.provider)}/connect?${new URLSearchParams({ role: intent.role })}`;
}
