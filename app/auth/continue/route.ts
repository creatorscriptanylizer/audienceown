import { NextResponse } from "next/server";
import { getCreator, getViewer } from "@/lib/dal";
import { getCreatorEntitlements } from "@/lib/provider-entitlements";
import { safeProInterval } from "@/lib/public-auth-intent";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const interval = url.searchParams.get("intent") === "pro" ? safeProInterval(url.searchParams.get("interval")) : null;
  if (!interval) return NextResponse.redirect(new URL("/dashboard", request.url));
  const user = await getViewer();
  if (!user) return NextResponse.redirect(new URL(`/register?intent=pro&interval=${interval}&mode=signin`, request.url));
  const creator = await getCreator();
  if (!creator) {
    const response = NextResponse.redirect(new URL("/onboarding", request.url));
    response.cookies.set("audienceown_post_onboarding_pro", interval, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 });
    return response;
  }
  const entitlements = await getCreatorEntitlements(creator.id, user);
  const destination = entitlements.plan === "pro" ? "/dashboard/settings/plans" : `/dashboard/settings/plans?checkout=${interval}`;
  return NextResponse.redirect(new URL(destination, request.url));
}
