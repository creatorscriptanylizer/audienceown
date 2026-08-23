import { NextResponse } from "next/server";
import { getOptionalViewer } from "@/lib/dal";
import { debugError, debugLog } from "@/lib/debug";
import { canonicalOAuthOrigin, oauthOriginCheck } from "@/lib/oauth-origin";
import { canonicalProviderHandoffUrl, providerConnectIntent, providerConnectPath } from "@/lib/provider-connect-handoff";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const intent = providerConnectIntent(url.searchParams.get("provider"), url.searchParams.get("role"));
  if (!intent) return NextResponse.redirect(new URL("/dashboard/platforms?connect=invalid_request", canonicalOAuthOrigin() ?? request.url));
  debugLog("oauth", { event:"provider_handoff_arrival", provider:intent.provider, role:intent.role });
  const origin = oauthOriginCheck(request);
  if (origin.loopDetected) return NextResponse.redirect(new URL("/dashboard/platforms?connect=invalid_request", origin.configuredOrigin ?? request.url));
  if (origin.redirectRequired) return NextResponse.redirect(canonicalProviderHandoffUrl(intent, origin.configuredOrigin));
  const continuation = canonicalProviderHandoffUrl(intent, origin.externalOrigin);
  let viewer;
  try {
    viewer = await getOptionalViewer();
  } catch (error) {
    debugError("oauth", error, { event:"provider_handoff_viewer_lookup_failed", provider:intent.provider, role:intent.role });
    return NextResponse.redirect(new URL("/dashboard/platforms?connect=temporarily_unavailable", origin.externalOrigin));
  }
  if (!viewer) {
    debugLog("oauth", { event:"provider_handoff_auth_required", provider:intent.provider, role:intent.role });
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`${continuation.pathname}${continuation.search}`)}`, origin.externalOrigin));
  }
  debugLog("oauth", { event:"provider_handoff_viewer_present", provider:intent.provider, role:intent.role });
  debugLog("oauth", { event:"provider_handoff_auth_resumed", provider:intent.provider, role:intent.role });
  debugLog("oauth", { event:"provider_handoff_oauth_started", provider:intent.provider, role:intent.role });
  return NextResponse.redirect(new URL(providerConnectPath(intent), origin.externalOrigin));
}
