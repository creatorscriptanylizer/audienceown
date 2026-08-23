import { NextResponse } from "next/server";
import { GET as connectMeta } from "@/app/api/integrations/meta/connect/route";
import { oauthOriginCheck } from "@/lib/oauth-origin";
import { canonicalProviderHandoffUrl } from "@/lib/provider-connect-handoff";

// Facebook uses the Meta asset-selection flow while keeping canonical OAuth
// initiation consistent with the other external providers.
export async function GET(request: Request) {
  const role = new URL(request.url).searchParams.get("role") ?? "official";
  if (role !== "official" && role !== "backup") return NextResponse.redirect(new URL("/dashboard/platforms?connect=invalid_request", request.url));
  const origin = oauthOriginCheck(request);
  if (origin.loopDetected) return NextResponse.redirect(new URL("/dashboard/platforms?connect=invalid_request", request.url));
  if (origin.redirectRequired) return NextResponse.redirect(canonicalProviderHandoffUrl({provider:"facebook",role}, origin.configuredOrigin));
  return connectMeta(request);
}
