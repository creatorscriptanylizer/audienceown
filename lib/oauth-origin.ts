import "server-only";
import { applicationOrigin } from "./app-url";

export type OAuthOriginCheck = {
  configuredOrigin: string | null;
  externalOrigin: string;
  redirectRequired: boolean;
  redirectTarget: URL | null;
  loopDetected: boolean;
};

export function canonicalOAuthOrigin() {
  const configured = process.env.APP_URL;
  if (!configured) return null;
  try {
    return applicationOrigin(configured);
  } catch {
    return null;
  }
}

export function oauthCallbackOrigin(request: Request) {
  const configured = canonicalOAuthOrigin();
  if (configured) return configured;
  try { return applicationOrigin(request.url) ?? new URL(request.url).origin; }
  catch { return "https://audienceown.com"; }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function unquote(value: string) {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).replace(/\\(["\\])/g, "$1") : value;
}

function forwardedOrigin(request: Request) {
  const forwarded = firstHeaderValue(request.headers.get("forwarded"));
  if (forwarded) {
    const values = new Map(forwarded.split(";").map((part) => {
      const separator = part.indexOf("=");
      return separator < 0 ? ["", ""] : [part.slice(0, separator).trim().toLowerCase(), unquote(part.slice(separator + 1).trim())];
    }));
    const proto = values.get("proto"), host = values.get("host");
    if (proto && host) {
      try { return new URL(`${proto}://${host}`).origin; } catch { /* Ignore malformed proxy metadata. */ }
    }
  }
  const proto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const host = firstHeaderValue(request.headers.get("x-forwarded-host"));
  if (!proto || !host) return null;
  try { return new URL(`${proto}://${host}`).origin; } catch { return null; }
}

export function oauthOriginCheck(request: Request): OAuthOriginCheck {
  const requestUrl = new URL(request.url);
  const configuredOrigin = canonicalOAuthOrigin();
  const proxyOrigin = forwardedOrigin(request);
  // Forwarded metadata is trusted only for the configured canonical origin. It
  // can never nominate an arbitrary host as the browser-facing OAuth origin.
  const externalOrigin = configuredOrigin && proxyOrigin === configuredOrigin ? proxyOrigin : requestUrl.origin;
  const redirectRequired = Boolean(configuredOrigin && externalOrigin !== configuredOrigin);
  const redirectTarget = redirectRequired ? new URL(`${requestUrl.pathname}${requestUrl.search}`, configuredOrigin!) : null;
  const externalUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, externalOrigin);
  return {configuredOrigin,externalOrigin,redirectRequired,redirectTarget,loopDetected:Boolean(redirectTarget && redirectTarget.toString() === externalUrl.toString())};
}

export function canonicalOAuthRequest(request: Request) {
  const check = oauthOriginCheck(request);
  return check.loopDetected ? null : check.redirectTarget;
}
