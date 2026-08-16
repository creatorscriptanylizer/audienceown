const canonicalOrigins = new Set([
  "https://audienceown.com",
  "https://dev.audienceown.com",
]);

const developmentOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function requireContactOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const parsedOrigin = new URL(origin).origin;
    if (canonicalOrigins.has(parsedOrigin)) return true;
    return process.env.NODE_ENV !== "production" && developmentOrigins.has(parsedOrigin);
  } catch {
    return false;
  }
}
