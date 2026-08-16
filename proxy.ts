import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function logDevelopmentTiming(label: "auth" | "request", pathname: string, startedAt: number) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[proxy] ${label} route=${pathname} elapsed_ms=${Date.now() - startedAt}`);
  }
}

export async function proxy(request: NextRequest) {
  const requestStartedAt = Date.now();
  const pathname = request.nextUrl.pathname;
  try {
    let response = NextResponse.next({ request });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return response;

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const authStartedAt = Date.now();
    let authResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;
    try {
      authResult = await supabase.auth.getClaims();
    } finally {
      logDevelopmentTiming("auth", pathname, authStartedAt);
    }

    if (authResult.error || !authResult.data?.claims?.sub) {
      const next = `${pathname}${request.nextUrl.search}`;
      const redirect = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }

    return response;
  } finally {
    logDevelopmentTiming("request", pathname, requestStartedAt);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
