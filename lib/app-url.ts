import "server-only";

export const PRODUCTION_APP_ORIGIN = "https://audienceown.com";
export const DEVELOPMENT_APP_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"] as const;
export const DEVELOPMENT_AUTH_ORIGINS = [PRODUCTION_APP_ORIGIN] as const;

export function applicationOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (loopback) url.protocol = "http:";
  return url.origin;
}

export function appUrl(path = "") {
  const base = process.env.APP_URL ?? (process.env.NODE_ENV === "development" ? DEVELOPMENT_APP_ORIGINS[0] : PRODUCTION_APP_ORIGIN);
  const origin = applicationOrigin(base);
  if (!origin) throw new Error("APP_URL must use HTTP or HTTPS.");
  return `${origin}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}

export function authApplicationOrigin(requestOrigin: string | null, environment = process.env.NODE_ENV) {
  if (!requestOrigin) return null;
  let origin: string;
  try {
    const parsed = new URL(requestOrigin);
    if (parsed.origin !== requestOrigin) return null;
    origin = parsed.origin;
  } catch {
    return null;
  }
  const allowed = environment === "development" ? DEVELOPMENT_AUTH_ORIGINS : [PRODUCTION_APP_ORIGIN];
  return (allowed as readonly string[]).includes(origin) ? origin : null;
}
