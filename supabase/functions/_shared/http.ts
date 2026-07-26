export const cors = {
  "access-control-allow-origin": Deno.env.get("APP_URL") ?? "http://localhost:3000",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" } });
}
export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export function log(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", event, requestId: crypto.randomUUID(), ...data }));
}
