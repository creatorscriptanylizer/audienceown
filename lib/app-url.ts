import "server-only";

export function applicationOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (loopback) url.protocol = "http:";
  return url.origin;
}

export function appUrl(path = "") {
  const base = process.env.APP_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://audienceown.com");
  const origin = applicationOrigin(base);
  if (!origin) throw new Error("APP_URL must use HTTP or HTTPS.");
  return `${origin}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}
