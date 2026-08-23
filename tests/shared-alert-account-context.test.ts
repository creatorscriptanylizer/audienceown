import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");
const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
const targeting = readFileSync("lib/new-video-targeting.ts", "utf8");

describe("shared alert connected-account context", () => {
  it("groups every canonical Main and Recovery account for optional context flows", () => {
    expect(studio).toContain("officialAccounts.map(accountContextCard)");
    expect(studio).toContain("recoveryAccounts.map(accountContextCard)");
    expect(studio).toContain(">Main accounts<");
    expect(studio).toContain(">Recovery accounts<");
    expect(studio).toContain('definition.platform === "optional"');
  });

  it("keeps required affected-account selectors Main-only", () => {
    expect(studio).toContain("officialAccounts.map((account) =>");
    expect(studio).toContain('definition.platform === "required" && !officialAccounts.length');
  });

  it("presents roles and preference-qualified recipient counts", () => {
    expect(studio).toContain('main ? "Main account" : "Recovery account"');
    expect(studio).toContain("opted in to ${audienceCopy.preferenceLabel}");
    expect(studio).toContain("Native platform followers are never recipients.");
    expect(studio).not.toContain("All matching subscribers");
  });

  it("persists all selected IDs in the existing context relationship", () => {
    expect(studio).toContain('name="selected_account_ids"');
    expect(actions).toContain("replaceUpdateContextAccounts");
    expect(targeting).toContain('from("creator_update_publishing_accounts")');
    expect(targeting).toContain("connected_account_reference: account.id");
  });

  it("validates ownership, canonical role, and account health server-side", () => {
    expect(targeting).toContain('.eq("creator_id", creatorId).in("id", uniqueIds)');
    expect(targeting).toContain('account.account_type !== "official" && account.account_type !== "backup"');
    expect(targeting).toContain("canonicalAccountConnected");
    expect(targeting).toContain("actionRequired");
  });

  it("does not pass context IDs into non-video audience preview", () => {
    expect(studio).toContain('previewCommunicationAudience(intent, scopedAccountIds)');
  });

  it("shows every selected account and its role in review", () => {
    expect(studio).toContain('accounts.filter((account) => selectedAccountIds.includes(account.id))');
    expect(studio).toContain('account.account_type === "official" ? "MAIN" : "RECOVERY"');
  });
});
