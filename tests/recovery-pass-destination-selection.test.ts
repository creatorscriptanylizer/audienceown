import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const server = readFileSync("lib/recovery-pass-destinations.ts", "utf8");
const route = readFileSync("app/api/public/recovery-pass/destinations/route.ts", "utf8");
const ui = readFileSync("components/recovery-pass-destinations.tsx", "utf8");
const experience = readFileSync("components/public-creator-experience.tsx", "utf8");
const schema = readFileSync("supabase/migrations/20260827000000_platform_audience_metrics.sql", "utf8");
const compact = (value: string) => value.replace(/\s+/g, "");

describe("fan Recovery Pass destination selection", () => {
  it("loads creator-owned Backups independently of any Main account relationship", () => {
    expect(compact(server)).toContain(compact('.eq("creator_id", creator.id).eq("account_type", "backup")'));
    expect(server).not.toContain("protected_official_account_id");
    expect(server).not.toContain('account_type", "official"');
  });

  it("supports canonical OAuth, verified replacement, and ecosystem/manual destinations", () => {
    expect(server).toContain('from("connected_accounts")');
    expect(server).toContain('from("creator_identity_accounts")');
    expect(server).toContain('from("creator_ecosystem_destinations")');
    expect(compact(server)).toContain(compact('.eq("account_kind", "replacement_account")'));
    expect(compact(server)).toContain(compact('.eq("verification_status", "verified")'));
  });

  it("rejects revoked, archived, private, cross-creator, and invalid destinations", () => {
    expect(compact(server)).toContain(compact('.eq("creator_id", creator.id)'));
    expect(compact(server)).toContain(compact('.eq("is_public", true)'));
    expect(compact(server)).toContain(compact('.eq("public_visible", true)'));
    expect(compact(server)).toContain(compact('.is("revoked_at", null).is("archived_at", null)'));
    expect(compact(server)).toContain(compact('item.connection_health !== "revoked"'));
    expect(compact(server)).toContain(compact('item.provider_status !== "revoked"'));
    expect(server).toContain('throw new Error("invalid_destination")');
  });

  it("uses the current scoped participant token and validates its active lifetime", () => {
    expect(server).toContain('createHash("sha256").update(preferenceToken)');
    expect(compact(server)).toContain(compact('.eq("preference_token_hash", tokenHash)'));
    expect(compact(server)).toContain(compact('.eq("creator_id", creator.id)'));
    expect(compact(server)).toContain(compact('connection.status !== "active"'));
    expect(server).toContain("management_tokens_revoked_at");
    expect(server).toContain("preference_token_expires_at");
    expect(route).toContain("requireSameOrigin(request)");
  });

  it("loads selected state and mutates only the canonical preference table", () => {
    expect(server.match(/from\("follower_recovery_destination_preferences"\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(compact(server)).toContain(compact('item.status === "active"'));
    expect(compact(server)).toContain(compact('status: "opted_out", opted_out_at: now'));
    expect(server).not.toContain(".delete(");
  });

  it("keeps retries idempotent at the database boundary", () => {
    expect(schema).toContain("follower_recovery_destination_connection_uidx");
    expect(schema).toContain("follower_recovery_destination_identity_uidx");
    expect(schema).toContain("follower_recovery_destination_ecosystem_uidx");
    expect(compact(server)).toContain(compact('error?.code !== "23505"'));
    expect(compact(server)).toContain(compact('existing.status === "active"'));
  });

  it("offers multiple truthful opt-in actions and safe external links", () => {
    expect(ui).toContain("Select one or more backup paths");
    expect(ui).toContain("does not verify a native follow or membership");
    expect(ui).toContain("Add recovery destination");
    expect(ui).toContain('rel="noopener noreferrer"');
    expect(compact(server)).toContain(compact('url.protocol === "https:"'));
  });

  it("creates backend participation for email and preserves full fan opt-out", () => {
    expect(experience).toContain('slug: creator.handle, email: contact, consent: true');
    expect(experience).toContain("unsubscribeToken");
    expect(experience).toContain('/functions/v1/unsubscribe`');
    expect(experience).toContain("<RecoveryPassDestinations");
  });

  it("never exposes provider secrets or uses native audience totals", () => {
    expect(route).not.toMatch(/SERVICE_ROLE|ADMIN_KEY|access_token|refresh_token/i);
    expect(server).not.toMatch(/audience_count|followers|subscribers/);
    expect(ui).not.toMatch(/verified follower|confirmed subscriber|confirmed Discord join/i);
  });
});
