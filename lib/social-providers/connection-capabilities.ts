import type { ProviderConnectionCapability, ProviderManualInput, SocialProvider, SocialProviderAdapter } from "./types";
import { providerRegistryEntry } from "./provider-registry";
import { debugLog } from "@/lib/debug";

const manualInputs: Record<SocialProvider, ProviderManualInput> = {
  youtube:"channel_url", instagram:"profile_url", tiktok:"profile_url", x:"profile_url",
  spotify:"profile_url", twitch:"channel_url", linkedin:"profile_url", facebook:"profile_url",
  snapchat:"profile_url", pinterest:"profile_url", discord:"invite_url",
  podcast:"feed_url", rss:"feed_url",
};
const audienceUnits: Partial<Record<SocialProvider, ProviderConnectionCapability["audienceUnit"]>> = {
  youtube:"subscribers", instagram:"followers", tiktok:"followers", x:"followers",
  twitch:"followers", facebook:"followers", snapchat:"followers",
  pinterest:"followers", discord:"members",
};

export function providerConnectionCapability(adapter: SocialProviderAdapter, _legacyConfigured?: boolean): ProviderConnectionCapability {
  void _legacyConfigured;
  if(adapter.provider==="podcast"||adapter.provider==="rss")return{provider:adapter.provider,displayName:adapter.displayName,description:adapter.displayName,implementationStatus:"coming_soon",configurationStatus:"missing",reviewStatus:"not_applicable",connectable:false,connectPath:null,oauthSupported:false,oauthStatus:"unsupported",manualSupported:false,manualInput:manualInputs[adapter.provider],supportsAudienceMetrics:false,audienceUnit:null,supportsAutomaticVerification:false,supportsManualVerification:false,supportsWebhooks:false,supportsPolling:false};
  const entry=providerRegistryEntry(adapter.provider,adapter),implemented=entry.oauthImplemented;
  const configurationStatus=entry.configuration,readiness=adapter.readiness?.(),rawReview=readiness&&"reviewStatus" in readiness?readiness.reviewStatus:undefined;
  const reviewStatus=!implemented||adapter.availability!=="provider_review_required"?"not_applicable" as const:rawReview==="approved"?"approved" as const:rawReview==="required"||rawReview==="submitted"||rawReview==="restricted"||rawReview==="rejected"?"required" as const:"unknown" as const;
  const connectable=implemented&&configurationStatus==="configured"&&adapter.capabilities.oauth&&Boolean(adapter.createAuthorizationUrl)&&Boolean(entry.connectPath);
  const oauthStatus = !entry.oauthImplemented ? "unsupported" as const
    : configurationStatus!=="configured" ? "not_configured" as const
    : reviewStatus==="required"||reviewStatus==="unknown" ? "review_required" as const : "available" as const;
  const capability:ProviderConnectionCapability={
    provider:adapter.provider, displayName:entry.displayName, description:entry.description,
    implementationStatus:implemented?"implemented":"coming_soon",configurationStatus,reviewStatus,connectable,
    connectPath:entry.connectPath,oauthSupported:entry.oauthImplemented,
    oauthStatus, manualSupported:false, manualInput:manualInputs[adapter.provider],
    supportsAudienceMetrics:entry.audienceMetricSupported, audienceUnit:entry.audienceMetricSupported?(audienceUnits[adapter.provider] ?? null):null,
    supportsAutomaticVerification:adapter.emergencyVerification.oauthIdentityVerification,
    supportsManualVerification:adapter.emergencyVerification.profileChallengeVerification || adapter.capabilities.manualImport,
    supportsWebhooks:adapter.capabilities.webhooks, supportsPolling:adapter.capabilities.polling,
  };
  debugLog("providers",{event:"provider_capability",provider:adapter.provider,implemented,configuration:configurationStatus,review:reviewStatus,connectable,connectPath:entry.connectPath,credentialsPresent:configurationStatus!=="missing"});
  return capability;
}
