import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCreator, getViewer } from "@/lib/dal";
import { createYouTubeOAuthState, getYouTubeAuthorizationUrl } from "@/lib/youtube-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const [user, creator] = await Promise.all([getViewer(), getCreator()]);
  if (!user || !creator) return NextResponse.redirect(new URL("/login?next=/dashboard/platforms", request.url));
  const nonce = randomBytes(24).toString("base64url");
  const state = createYouTubeOAuthState({
    creatorId: creator.id, userId: user.id, nonce, expiresAt: Date.now() + 10 * 60_000,
  });
  const store = await cookies();
  store.set("youtube_oauth_nonce", nonce, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/api/integrations/youtube/callback", maxAge: 600,
  });
  return NextResponse.redirect(getYouTubeAuthorizationUrl(state));
}
