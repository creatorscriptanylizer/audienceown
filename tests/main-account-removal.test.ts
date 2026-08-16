import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(path), "utf8");
const compact = (value: string) => value.replace(/\s+/g, "");
const manager = source("components/platforms-manager.tsx");
const actions = source("app/actions/creator.ts");
const removal = source("lib/connected-account-removal.ts");
const historyMigration = source("supabase/migrations/20260829000000_detach_connected_account_history.sql");
const cleanupGrants = source("supabase/migrations/20260829000001_service_role_connected_account_cleanup_grants.sql");
const providerAccounts = source("lib/social-providers/creator-provider-accounts.ts");
const platformsPage = source("app/dashboard/platforms/page.tsx");

describe("official account removal", () => {
  it("offers a restrained per-account remove action", () => {
    expect(manager).toContain('aria-label={`Remove ${account.label||platform.name}`}');
    expect(manager).toContain("removeOfficial(index)");
    expect(manager).toContain("removeMainAccount(item.id)");
    expect(manager).toContain("officials:value.officials.filter");
  });

  it("keeps failure state intact and shows the required feedback", () => {
    expect(actions).toContain("We couldn’t remove this account. Please try again.");
    expect(manager).toContain("if(result.error){window.alert(result.error);return;}");
    expect(manager.indexOf("if(result.error)")).toBeLessThan(manager.indexOf("officials:value.officials.filter"));
  });

  it("authorizes the exact creator-owned official connection without requiring global primary status", () => {
    expect(compact(actions)).toContain(compact('.eq("id", parsed.data).eq("creator_id", creator.id)'));
    expect(compact(actions)).toContain(compact('.eq("account_type", "official").maybeSingle()'));
    expect(removal).toContain('.eq("id", connectionId).eq("creator_id", creatorId)');
  });

  it("cleans attached provider state without selecting or promoting a backup", () => {
    expect(removal).toContain('deleteCreatorYouTubeAuthorizedData(admin, creatorId, connectionId, "remove_account")');
    expect(removal).toContain('from("platform_connection_secrets").delete().eq("platform_connection_id", connectionId)');
    expect(historyMigration).toContain("creator_updates_affected_platform_connection_id_fkey");
    expect(removal).not.toMatch(/account_type:\s*["']official["']/);
    expect(removal).not.toMatch(/is_primary:\s*true/);
  });

  it("regresses the failure where pending Google revocation blocked row removal", () => {
    const youtubeDeletion = source("lib/youtube-data-deletion.ts");
    expect(youtubeDeletion).toContain('if (revocation.status === "pending")');
    expect(youtubeDeletion).toContain("if (secret)");
    expect(youtubeDeletion.indexOf("if (secret)")).toBeLessThan(youtubeDeletion.indexOf('if (mode === "remove_account")'));
    expect(actions).toContain("connected_account_removal_failed");
    expect(actions).toContain("postgresCode");
    expect(actions).toContain("step:");
  });

  it("uses the canonical removal helper for every full-removal entry point", () => {
    const disconnectRoute = source("app/api/integrations/youtube/disconnect/route.ts");
    expect(compact(actions)).toContain(compact("removeCreatorConnectedAccount(admin, creator.id, ownedMain.data.id)"));
    expect(disconnectRoute).toContain('input.mode === "remove_account"');
    expect(disconnectRoute).toContain("removeCreatorConnectedAccount(admin, creator.id, input.connectionId)");
    expect(disconnectRoute).toContain('deleteCreatorYouTubeAuthorizedData(admin, creator.id, input.connectionId, "keep_manual")');
  });

  it("proves physical deletion and traces the exact Configure Accounts lifecycle", () => {
    const youtubeDeletion = source("lib/youtube-data-deletion.ts");
    expect(actions).toContain('step:"ui_request_received"');
    expect(actions).toContain('step:"authenticated"');
    expect(actions).toContain('step:"connection_loaded"');
    expect(removal).toContain('step:"provider_cleanup_start"');
    expect(youtubeDeletion).toContain('step:"credentials_lookup"');
    expect(youtubeDeletion).toContain('step:"credentials_absent"');
    expect(youtubeDeletion).toContain('step:"local_cleanup_start"');
    expect(youtubeDeletion).toContain('.delete().eq("id", connectionId).eq("creator_id", creatorId).select("id").maybeSingle()');
    expect(youtubeDeletion).toContain('if (!removed.data) throw new Error("connected_account_not_deleted")');
    expect(actions).toContain('step:"revalidation"');
    expect(actions).toContain('step:"success"');
  });

  it("grants only the cleanup operations proven missing by the live 42501 failure", () => {
    expect(cleanupGrants).toContain("grant delete on public.imported_social_content to service_role");
    expect(cleanupGrants).toContain("grant delete on public.social_detection_events to service_role");
    expect(cleanupGrants).toContain("grant update on public.creator_updates to service_role");
    expect(cleanupGrants).not.toContain("connected_accounts");
  });

  it("preserves historical and preparedness records by detaching restrictive references", () => {
    expect(historyMigration).toContain("emergency_affected_accounts_connected_account_id_fkey");
    expect(historyMigration).toContain("emergency_plans_affected_account_id_fkey");
    expect(historyMigration.match(/on delete set null/g)).toHaveLength(3);
    expect(historyMigration).toContain("alter column affected_account_id drop not null");
    expect(historyMigration).toContain("The affected account was disconnected. Choose another official account.");
    expect(removal).not.toContain('from("emergency_affected_accounts").delete()');
    expect(removal).not.toContain('from("emergency_plans").delete()');
  });

  it("shows an empty official state while retaining the independent backup UI", () => {
    expect(manager).toContain("No official accounts connected");
    expect(manager).toContain("Add the first platform your audience knows you from.");
    expect(manager).toContain("Add official account");
    expect(manager).toContain("draft.backups.map");
  });

  it("builds fresh official and backup drafts whenever configuration opens", () => {
    expect(manager).toContain("officials:savedOfficials.map(accountDraft)");
    expect(manager).toContain("savedBackups.map(accountDraft)");
  });

  it("feeds Configure Accounts the same canonically active connections used by Dashboard", () => {
    expect(providerAccounts).toContain("configuredConnections = connections.filter");
    expect(providerAccounts).toContain("creatorConnectionProjectionState(connection, assets, identities).active");
    expect(platformsPage).toContain("const {configuredConnections");
    expect(platformsPage).toContain("const accounts=configuredConnections.map");
  });

  it("starts replacement OAuth as official and preserves backup removal", () => {
    expect(manager).toContain("connectPath}?role=${flow.role}");
    expect(actions).toContain('account_type:"official"');
    expect(actions).toContain("existingPrimaryId");
    expect(manager).toContain("backups:value.backups.filter");
  });

  it("preserves multiple official platforms and enforces one official per platform", () => {
    expect(compact(actions)).toContain(compact("officials: z.array(platformAccountInput)"));
    expect(actions).toContain("Only one official account can be added per platform.");
    expect(actions).toContain("parsed.data.officials.map");
    expect(manager).toContain("connectedOfficial.has(platform.id)");
    expect(manager).toContain("draft.officials.map");
  });
});
