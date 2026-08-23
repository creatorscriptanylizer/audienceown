import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("New video multi-account workflow", () => {
  const studio = source("components/broadcast-studio/broadcast-studio.tsx");
  const actions = source("app/dashboard/updates/actions.ts");
  const targeting = source("lib/new-video-targeting.ts");
  const delivery = source("lib/update-delivery.ts");
  const activity = source("lib/updates-activity.ts");
  const definitions = source("lib/broadcast-studio.ts");
  const atomicDraftMigration = source("supabase/migrations/20260923000000_atomic_new_video_drafts.sql");
  const legacyConstraintFix = source("supabase/migrations/20260924000000_remove_legacy_publishing_target_check.sql");

  it("uses a multi-select account-ID-only client contract", () => {
    expect(definitions).toContain("Where did you publish this?");
    expect(studio).toContain('role="checkbox"');
    expect(studio).toContain("Main accounts");
    expect(studio).toContain("Recovery accounts");
    expect(studio).toContain("PlatformBrandIcon");
    expect(studio).toContain('name="selected_account_ids"');
    expect(studio).not.toContain('name="selected_account_role"');
    expect(actions).toContain('data.getAll("selected_account_ids")');
  });

  it("previews through the same canonical server resolver used at submission time", () => {
    expect(actions).toContain("resolveNewVideoAudience(creator.id, accountIds)");
    expect(actions).toContain("replaceUpdatePublishingAccounts");
    expect(delivery).toContain("resolveNewVideoAudience(creatorId");
    expect(targeting).toContain('account.account_type === "official"');
  });

  it("requires Recovery Pass Videos consent and a verified delivery method", () => {
    expect(targeting).toContain('resolveCommunicationAudiencePreview(creatorId, "new_video", uniqueIds)');
    expect(targeting).toContain("eligibleContactIds");
    expect(readFileSync("lib/communication-audience.ts", "utf8")).toContain("follower_connection_account_memberships");
    expect(readFileSync("lib/communication-audience.ts", "utf8")).toContain("follower_recovery_destination_preferences");
  });

  it("derives roles and validates account health on the server", () => {
    expect(targeting).toContain("canonicalAccountConnected");
    expect(targeting).toContain("resolveConnectionStatus");
    expect(targeting).toContain('account.account_type === "official"');
    expect(targeting).toContain('account.account_type !== "backup"');
    expect(targeting).toContain('throw new NewVideoTargetingError("invalid_accounts")');
  });

  it("provides an explicit review and video-alert send boundary", () => {
    for (const copy of ["Calculating Recovery Pass audience…", "Continue to review", "Preparing review…", "05 · Review your video alert", "Check your message and audience before sending."]) {
      expect(studio).toContain(copy);
    }
    expect(definitions).toContain('sendLabel:"Send video alert"');
    expect(studio).toContain("audiencePreview.error");
    expect(studio).toContain("Calculating Recovery Pass audience…");
    expect(studio).toContain("Account context only. Native platform followers are never recipients.");
  });

  it("submits Continue to review through the draft action without requiring a non-zero preview", () => {
    expect(studio).toContain('type="submit" name="continue_to_review" value="true"');
    expect(studio).toContain("const reviewDisabled = savePending");
    expect(studio).toContain("disabled={reviewDisabled}");
    expect(studio).not.toContain("disabled={publishDisabled || savePending}");
    expect(actions).toContain('data.get("continue_to_review") === "true"');
    expect(actions).toContain('event: "draft_saved_for_review"');
    expect(actions).toContain('event: "review_navigation_ready"');
    expect(actions).toContain('? "?review=1" : ""');
  });

  it("validates review fields server-side and does not turn review into delivery", () => {
    expect(actions).toContain("reviewValidationState(values, updatePublishSchema.safeParse(values))");
    expect(actions).toContain("Add a valid HTTPS destination URL.");
    const createDraftBody = actions.slice(actions.indexOf("export async function createDraft"), actions.indexOf("export async function updateDraft"));
    expect(createDraftBody).not.toContain("publishDeliveryQueue");
  });

  it("atomically creates the draft and publishing context without delivery side effects", () => {
    expect(actions).toContain('rpc("create_new_video_draft_with_publishing_accounts"');
    expect(atomicDraftMigration).toContain("insert into public.creator_updates");
    expect(atomicDraftMigration).toContain("insert into public.creator_update_publishing_accounts");
    expect(atomicDraftMigration).not.toContain("update_deliveries");
    expect(atomicDraftMigration).toContain("recovery_pass_video_opt_in");
  });

  it("removes the auto-named legacy constraint that rejected canonical targeting provenance", () => {
    expect(legacyConstraintFix).toContain("drop constraint if exists creator_update_publishing_account_targeting_rule_snapshot_check");
    expect(legacyConstraintFix).toContain("recovery_pass_video_opt_in");
    expect(legacyConstraintFix).not.toContain("update_deliveries");
  });

  it("surfaces all immutable publishing snapshots in activity history", () => {
    expect(activity).toContain("publishingAccounts");
    expect(activity).toContain("account_display_snapshot");
    expect(activity).toContain("Recovery context");
  });
});
