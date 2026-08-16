import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd(), true);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const isLocal = (() => { try { return ["localhost", "127.0.0.1"].includes(new URL(url).hostname); } catch { return false; } })();
if (process.env.NODE_ENV === "production" || !isLocal || !serviceKey || !publishableKey) throw new Error("Stage 8.8 fixtures require a local Supabase URL, publishable key, and server-only service-role key.");

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const email = "stage88@audienceown.local";
const password = "LocalStage88!";
const ids = {
  creator: "88000000-0000-4000-8000-000000000001",
  profile: "88000000-0000-4000-8000-000000000002",
  youtube: "88000000-0000-4000-8000-000000000010",
  tiktok: "88000000-0000-4000-8000-000000000011",
  youtubeBackup: "88000000-0000-4000-8000-000000000012",
};

function assert(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

const listed = assert(await db.auth.admin.listUsers({ page: 1, perPage: 1000 }), "list local users");
let user = listed.users.find((candidate) => candidate.email === email);
if (!user) user = assert(await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "Stage 8.8 Demo" } }), "create local auth user").user;
else assert(await db.auth.admin.updateUserById(user.id, { password, email_confirm: true }), "reset local fixture login");

await db.from("creators").delete().eq("owner_user_id", user.id);
await db.from("follower_contacts").delete().in("email_hash", ["stage88-fixture-a", "stage88-fixture-b", "stage88-fixture-c"]);
assert(await db.from("creators").insert({ id: ids.creator, owner_user_id: user.id, display_name: "Stage 8.8 Demo", public_slug: "stage-8-8-demo", public_profile_enabled: false, recovery_pass_enabled: true }), "create fixture creator");
assert(await db.from("creator_identity_profiles").insert({ id: ids.profile, creator_id: ids.creator, public_display_name: "Stage 8.8 Demo", identity_status: "verified" }), "create identity profile");

const now = new Date().toISOString();
assert(await db.from("connected_accounts").insert([
  { id: ids.youtube, creator_id: ids.creator, platform: "youtube", account_type: "official", label: "Stage 8.8 Main YouTube", url: "https://www.youtube.com/@stage88-main-fixture", is_primary: true, connection_health: "healthy", provider_status: "ready", external_account_id: "fixture-youtube-main", external_account_name: "Stage 8.8 Main YouTube", external_account_url: "https://www.youtube.com/@stage88-main-fixture", last_sync_at: now },
  { id: ids.tiktok, creator_id: ids.creator, platform: "tiktok", account_type: "backup", label: "Stage 8.8 TikTok Backup", url: "https://www.tiktok.com/@stage88-backup-fixture", is_primary: true, connection_health: "healthy", provider_status: "ready", external_account_id: "fixture-tiktok-backup", external_account_name: "Stage 8.8 TikTok Backup", external_account_url: "https://www.tiktok.com/@stage88-backup-fixture", last_sync_at: now },
  { id: ids.youtubeBackup, creator_id: ids.creator, platform: "youtube", account_type: "backup", label: "Stage 8.8 YouTube Backup", url: "https://www.youtube.com/@stage88-backup-fixture", is_primary: false, connection_health: "healthy", provider_status: "ready", external_account_id: "fixture-youtube-backup", external_account_name: "Stage 8.8 YouTube Backup", external_account_url: "https://www.youtube.com/@stage88-backup-fixture", last_sync_at: now },
]), "create fixture accounts");

const identityRows = [
  [ids.youtube, "youtube", "fixture-youtube-main", "@stage88-main-fixture", "Stage 8.8 Main YouTube", "channel", true, true],
  [ids.tiktok, "tiktok", "fixture-tiktok-backup", "@stage88-backup-fixture", "Stage 8.8 TikTok Backup", "creator_account", false, false],
  [ids.youtubeBackup, "youtube", "fixture-youtube-backup", "@stage88-youtube-backup", "Stage 8.8 YouTube Backup", "channel", false, false],
].map(([connection, provider, stable, handle, name, kind, official, primary]) => ({
  identity_profile_id: ids.profile, creator_id: ids.creator, provider, stable_provider_account_id: stable,
  display_handle: handle, display_name: name, canonical_profile_url: provider === "tiktok" ? "https://www.tiktok.com/@stage88-backup-fixture" : `https://www.youtube.com/${handle}`,
  account_kind: kind, verification_status: "verified", verification_method: "local_stage_8_8_fixture", verification_confidence: "high",
  source_connection_id: connection, official, primary_for_provider: primary, first_verified_at: now, last_verified_at: now, last_synced_at: now, sync_status: "healthy",
}));
assert(await db.from("creator_identity_accounts").insert(identityRows), "create verified fixture identities");

assert(await db.from("provider_audience_metrics").insert([
  { creator_id: ids.creator, connection_id: ids.youtube, provider: "youtube", account_category: "official", audience_count: 125000, audience_unit: "subscribers", status: "available", source_observed_at: now, synchronized_at: now, error_code: "development_fixture" },
  { creator_id: ids.creator, connection_id: ids.tiktok, provider: "tiktok", account_category: "backup", audience_count: 18400, audience_unit: "followers", status: "available", source_observed_at: now, synchronized_at: now, error_code: "development_fixture" },
  { creator_id: ids.creator, connection_id: ids.youtubeBackup, provider: "youtube", account_category: "backup", audience_count: 4200, audience_unit: "subscribers", status: "available", source_observed_at: now, synchronized_at: now, error_code: "development_fixture" },
]), "create fixture-only metrics");

const fans = ["a", "b", "c"].map((suffix, index) => ({
  contact: { id: `88000000-0000-4000-8000-00000000002${index}`, email_ciphertext: `local-fixture-${suffix}`, email_hash: `stage88-fixture-${suffix}`, email_masked: "local fixture fan" },
  connection: { id: `88000000-0000-4000-8000-00000000003${index}`, creator_id: ids.creator, follower_contact_id: `88000000-0000-4000-8000-00000000002${index}`, status: "active", preference_token_hash: `stage88-preference-${suffix}`, unsubscribe_token_hash: `stage88-unsubscribe-${suffix}` },
}));
assert(await db.from("follower_contacts").insert(fans.map((fan) => fan.contact)), "create privacy-safe fixture fans");
assert(await db.from("follower_connections").insert(fans.map((fan) => fan.connection)), "create fixture relationships");
assert(await db.from("follower_recovery_destination_preferences").insert([
  { creator_id: ids.creator, follower_connection_id: fans[0].connection.id, connected_account_id: ids.tiktok },
  { creator_id: ids.creator, follower_connection_id: fans[0].connection.id, connected_account_id: ids.youtubeBackup },
  { creator_id: ids.creator, follower_connection_id: fans[1].connection.id, connected_account_id: ids.tiktok },
  { creator_id: ids.creator, follower_connection_id: fans[2].connection.id, connected_account_id: ids.youtubeBackup },
]), "create overlapping recovery preferences");

const viewer = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
assert(await viewer.auth.signInWithPassword({ email, password }), "sign in fixture user");
const protectedFans = assert(await viewer.rpc("get_creator_protected_fan_count"), "read protected fan aggregate");
const destinations = assert(await viewer.rpc("get_creator_recovery_destination_breakdown"), "read destination aggregates");
if (protectedFans !== 3) throw new Error(`fixture assertion: expected 3 protected fans, received ${protectedFans}`);
for (const accountId of [ids.tiktok, ids.youtubeBackup]) {
  const destination = destinations.find((row) => row.destination_id === accountId);
  if (destination?.opted_in_fan_count !== 2 || Number(destination.coverage_percent) !== 66.7) {
    throw new Error(`fixture assertion: expected destination ${accountId} to have 2 fans and 66.7% coverage`);
  }
}

console.log("Local Stage 8.8 fixture ready.");
console.log(`Login: ${email}`);
console.log(`Password: ${password}`);
console.log("Expected protected fans: 3; TikTok: 2 (66.7%); YouTube backup: 2 (66.7%).");
