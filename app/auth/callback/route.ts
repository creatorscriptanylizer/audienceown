import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-flow";
import { oauthOriginCheck } from "@/lib/oauth-origin";
import { debugError, debugLog } from "@/lib/debug";
import { cookies } from "next/headers";

function callbackRedirect(origin: string, path: string) {
  return NextResponse.redirect(`${origin}${path}`);
}

function confirmationRecoveryPath(next: string) {
  const query = new URLSearchParams({ next });
  return `/confirmation?${query}`;
}

async function hasPkceContext() {
  try { return (await cookies()).getAll().some(({ name }) => name.includes("-code-verifier")); }
  catch { return false; }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const originCheck = oauthOriginCheck(request);
  const origin = originCheck.configuredOrigin;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = safeNextPath(next);
  const nextValidationResult = next == null ? "defaulted" : safeNext === next ? "valid" : "rejected";
  const pkceContextPresent = await hasPkceContext();
  const canonical = origin ? new URL(origin) : null;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  debugLog("oauth", {
    event: "auth_callback_arrival",
    callbackHost: url.host,
    callbackProtocol: url.protocol,
    forwardedHostPresent: Boolean(request.headers.get("x-forwarded-host")),
    forwardedProtoPresent: Boolean(request.headers.get("x-forwarded-proto")),
    forwardedHostMatchesCanonical: forwardedHost === canonical?.host,
    forwardedProtoHttps: forwardedProto === "https",
    codePresent: Boolean(code),
    providerErrorPresent: url.searchParams.has("error"),
    providerErrorCode: url.searchParams.get("error_code") ?? undefined,
    pkceContextPresent,
    nextValidationResult,
  });
  if (!origin || originCheck.externalOrigin !== origin) {
    debugLog("oauth", { event: "auth_callback_origin_rejected", callbackHost: url.host, callbackProtocol: url.protocol, codePresent: Boolean(code), pkceContextPresent, nextValidationResult });
    return Response.json({ error: "invalid_callback_origin" }, { status: 400 });
  }
  const canonicalOrigin = new URL(origin);
  debugLog("oauth", { event: "auth_callback_origin_validated", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: Boolean(code), pkceContextPresent, nextValidationResult });
  const providerErrorCode = url.searchParams.get("error_code");
  if (!code && providerErrorCode) {
    debugLog("oauth", { event: "auth_confirmation_link_inactive", providerErrorCode, nextValidationResult });
    return callbackRedirect(origin, confirmationRecoveryPath(safeNext));
  }
  if (!code) {
    debugLog("oauth", { event: "auth_callback_code_missing", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: false, pkceContextPresent, nextValidationResult });
    return callbackRedirect(origin, `/login?next=${encodeURIComponent(safeNext)}&error=missing_code`);
  }
  debugLog("oauth", { event: "auth_callback_code_present", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: true, pkceContextPresent, nextValidationResult });
  if (!pkceContextPresent) {
    debugLog("oauth", { event: "auth_callback_pkce_missing", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: true, pkceContextPresent: false, nextValidationResult });
    return callbackRedirect(origin, `/login?next=${encodeURIComponent(safeNext)}&error=callback`);
  }
  debugLog("oauth", { event: "auth_callback_pkce_present", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: true, pkceContextPresent: true, nextValidationResult });
  const client = await createClient();
  if (!client) return callbackRedirect(origin, `/login?next=${encodeURIComponent(safeNext)}&error=configuration`);
  debugLog("oauth", { event: "auth_callback_exchange_started", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: true, pkceContextPresent: true, nextValidationResult });
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    debugError("oauth", error, { event: "auth_callback_exchange_failed", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: true, pkceContextPresent: true, nextValidationResult });
    return callbackRedirect(origin, `/login?next=${encodeURIComponent(safeNext)}&error=callback`);
  }
  debugLog("oauth", { event: "auth_callback_exchange_succeeded", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: true, pkceContextPresent: true, nextValidationResult });
  debugLog("oauth", { event: "auth_callback_next_validated", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: true, pkceContextPresent: true, nextValidationResult });
  debugLog("oauth", { event: "auth_callback_complete", callbackHost: canonicalOrigin.host, callbackProtocol: canonicalOrigin.protocol, codePresent: true, pkceContextPresent: true, nextValidationResult });
  return callbackRedirect(origin, safeNext);
}
