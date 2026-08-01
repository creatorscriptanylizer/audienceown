import { createAdminClient } from "@/lib/supabase/admin";
import { publicJwk, signingConfig } from "@/lib/authenticity/signing";

export async function GET() {
  const db = createAdminClient();
  const configured = signingConfig();
  const { data } = db
    ? await db.from("authenticity_signing_keys").select("key_id,public_jwk,revoked_at,retire_after").is("revoked_at", null)
    : { data: [] };
  const now = Date.now();
  const keys: Record<string, unknown>[] = (data ?? [])
    .filter((key) => !key.retire_after || Date.parse(key.retire_after) > now)
    .map((key) => ({
      ...(key.public_jwk && typeof key.public_jwk === "object" && !Array.isArray(key.public_jwk) ? key.public_jwk : {}),
      kid: key.key_id,
      alg: "EdDSA",
      use: "sig",
    }));
  const current = configured ? publicJwk(configured.publicKey, configured.keyId) : null;
  if (current && !keys.some((key) => key.kid === current.kid)) keys.push(current);
  return Response.json({ keys }, { headers: { "cache-control": "public, max-age=300, must-revalidate" } });
}
