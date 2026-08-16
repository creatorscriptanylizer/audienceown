import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-flow";
import { appUrl } from "@/lib/app-url";
import { debugError, debugLog } from "@/lib/debug";
import { cookies } from "next/headers";

function callbackRedirect(path: string) {
  return NextResponse.redirect(appUrl(path));
}

async function hasPkceContext() {
  try { return (await cookies()).getAll().some(({ name }) => name.includes("-code-verifier")); }
  catch { return false; }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = safeNextPath(next);
  const pkceContextPresent = await hasPkceContext();
  const canonical = new URL(appUrl());
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  debugLog("oauth", {
    event: "auth_callback_arrival",
    callbackHost: url.host,
    callbackProtocol: url.protocol,
    forwardedHostPresent: Boolean(request.headers.get("x-forwarded-host")),
    forwardedProtoPresent: Boolean(request.headers.get("x-forwarded-proto")),
    forwardedHostMatchesCanonical: forwardedHost === canonical.host,
    forwardedProtoHttps: forwardedProto === "https",
    codePresent: Boolean(code),
    providerErrorPresent: url.searchParams.has("error"),
    providerErrorCode: url.searchParams.get("error_code") ?? undefined,
    pkceContextPresent,
  });
  if (!code) return callbackRedirect(`/login?next=${encodeURIComponent(safeNext)}&error=missing_code`);
  const client = await createClient();
  if (!client) return callbackRedirect(`/login?next=${encodeURIComponent(safeNext)}&error=configuration`);
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    debugError("oauth", error, { event: "auth_code_exchange_failed", callbackHost: url.host, pkceContextPresent });
    return callbackRedirect(`/login?next=${encodeURIComponent(safeNext)}&error=callback`);
  }
  debugLog("oauth", { event: "auth_code_exchange_succeeded", callbackHost: url.host, pkceContextPresent });
  return callbackRedirect(safeNext);
}
