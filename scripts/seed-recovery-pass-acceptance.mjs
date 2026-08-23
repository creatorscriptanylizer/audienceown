import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd(), true);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_ADMIN_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
const isLocal = (() => {
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
})();
if (!isLocal || !serviceKey || process.env.NODE_ENV === "production")
  throw new Error(
    "Recovery Pass acceptance fixtures require local Supabase and a service-role key.",
  );
const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const creatorId = "ac000000-0000-4000-8000-000000000001";
const accounts = [
  [
    "ac000000-0000-4000-8000-000000000010",
    "youtube",
    "official",
    "KwaMoon",
    "https://www.youtube.com/@kwamoon-acceptance",
    true,
  ],
  [
    "ac000000-0000-4000-8000-000000000011",
    "facebook",
    "official",
    "WatchBoost",
    "https://www.facebook.com/watchboost.acceptance",
    false,
  ],
  [
    "ac000000-0000-4000-8000-000000000012",
    "instagram",
    "backup",
    "nana_friggy",
    "https://www.instagram.com/nana_friggy_acceptance",
    true,
  ],
  [
    "ac000000-0000-4000-8000-000000000013",
    "youtube",
    "backup",
    "Lineconomy",
    "https://www.youtube.com/@lineconomy-acceptance",
    false,
  ],
  [
    "ac000000-0000-4000-8000-000000000014",
    "tiktok",
    "backup",
    "NPA",
    "https://www.tiktok.com/@npa_acceptance",
    false,
  ],
];
function assert(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
const users = assert(
  await db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  "list users",
);
let owner = users.users.find(
  (user) => user.email === "recovery-acceptance@audienceown.local",
);
if (!owner)
  owner = assert(
    await db.auth.admin.createUser({
      email: "recovery-acceptance@audienceown.local",
      password: "LocalAcceptance1!",
      email_confirm: true,
    }),
    "create owner",
  ).user;
await db.from("creators").delete().eq("owner_user_id", owner.id);
assert(
  await db
    .from("creators")
    .insert({
      id: creatorId,
      owner_user_id: owner.id,
      display_name: "Nana",
      recovery_pass_name: "Nana's Recovery Pass",
      public_slug: "recovery-acceptance",
      public_profile_enabled: true,
      recovery_pass_enabled: true,
      public_bio: "Deterministic local Recovery Pass acceptance fixture.",
    }),
  "create creator",
);
assert(
  await db
    .from("creator_plan_entitlements")
    .upsert(
      {
        creator_id: creatorId,
        plan: "pro",
        subscription_status: "active",
        source: "internal",
        source_reference: "local_recovery_acceptance_fixture",
      },
      { onConflict: "creator_id" },
    ),
  "grant fixture capacity",
);
const now = new Date().toISOString();
assert(
  await db
    .from("connected_accounts")
    .insert(
      accounts.map(
        ([id, platform, type, label, accountUrl, primary], position) => ({
          id,
          creator_id: creatorId,
          platform,
          account_type: type,
          label,
          url: accountUrl,
          external_account_name: label,
          external_account_url: accountUrl,
          external_account_id: `acceptance-${platform}-${position}`,
          is_public: true,
          is_primary: primary,
          position,
          connection_health: "healthy",
          provider_status: "ready",
          last_sync_at: now,
        }),
      ),
    ),
  "create accounts",
);
const network = assert(
  await db
    .from("recovery_networks")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("main_connected_account_id", accounts[0][0])
    .single(),
  "load network",
);
assert(
  await db
    .from("recovery_network_destinations")
    .insert(
      accounts
        .slice(2)
        .map(([id]) => ({
          recovery_network_id: network.id,
          recovery_connected_account_id: id,
        })),
    ),
  "create destinations",
);
console.log("Recovery Pass acceptance fixture ready: /c/recovery-acceptance");
