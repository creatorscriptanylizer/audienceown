import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { readRecoverySession, sha256 } from "@/lib/recovery-pass-session";
import type { PublicRecoveryAccount } from "@/lib/recovery-pass-enrollment";
import { debugLog, debugRecoveryMember, recoveryMemberDebugEnabled } from "@/lib/debug";

export type RecoveryPassMemberState = {
  membershipStatus: "active" | "paused" | "deactivated" | "unsubscribed";
  accounts: PublicRecoveryAccount[];
  preferences: Record<string, boolean>;
  deliveryMethods: Array<{ reference: string; type: "email" | "sms" | "web_push"; status: "verified"; masked: string; selected: boolean }>;
  recoveryAlerts: boolean;
};

async function diagnoseReturnFailure(admin: NonNullable<ReturnType<typeof createAdminClient>>, slug: string, tokenHash: string, rpcError: boolean) {
  if (!recoveryMemberDebugEnabled()) return;
  const now = new Date().toISOString();
  const [{ data: creators }, { data: credentials }] = await Promise.all([
    admin.from("creators").select("id").eq("public_slug", slug).limit(1),
    admin.from("follower_connections").select("creator_id,status,management_tokens_revoked_at,preference_token_expires_at").eq("preference_token_hash", tokenHash).limit(2),
  ]);
  const credential = credentials?.length === 1 ? credentials[0] : null;
  const credentialRecognized = Boolean(credential && !credential.management_tokens_revoked_at && credential.preference_token_expires_at > now);
  const credentialCreatorMatch = Boolean(credentialRecognized && creators?.[0]?.id === credential?.creator_id);
  const membershipFound = credentialCreatorMatch;
  const membershipActive = credential?.status === "active";
  debugRecoveryMember({
    event: "return_visit",
    managementCookiePresent: true,
    credentialRecognized,
    credentialCreatorMatch,
    membershipFound,
    membershipActive,
    memberStateLoaded: false,
    renderMode: "enrollment",
    failureReason: rpcError ? "member_state_lookup_failed" : !credential ? "credential_unrecognized" : credential.management_tokens_revoked_at ? "credential_revoked" : credential.preference_token_expires_at <= now ? "credential_expired" : !credentialCreatorMatch ? "credential_creator_mismatch" : !membershipActive ? "membership_inactive" : "member_state_invalid",
  });
}

export async function getRecoveryPassMemberState(slug: string): Promise<RecoveryPassMemberState | null> {
  const token = await readRecoverySession(slug);
  const admin = createAdminClient();
  if (!token || !admin) {
    debugRecoveryMember({ event: "return_visit", managementCookiePresent: Boolean(token), credentialRecognized: false, credentialCreatorMatch: false, membershipFound: false, membershipActive: false, memberStateLoaded: false, renderMode: "enrollment", failureReason: token ? "database_unavailable" : "management_cookie_absent" });
    return null;
  }
  const tokenHash = await sha256(token);
  const { data, error } = await admin.rpc("get_recovery_pass_member_state" as never, { p_slug: slug, p_preference_token_hash: tokenHash } as never) as unknown as { data: RecoveryPassMemberState | null; error: unknown };
  if (error || !data || data.membershipStatus !== "active" || data.recoveryAlerts !== true) {
    await diagnoseReturnFailure(admin, slug, tokenHash, Boolean(error));
    return null;
  }
  debugRecoveryMember({ event: "return_visit", managementCookiePresent: true, credentialRecognized: true, credentialCreatorMatch: true, membershipFound: true, membershipActive: true, memberStateLoaded: true, renderMode: "management", failureReason: null });
  debugLog("general", { event: "recovery_pass_management_state_loaded", creatorSlug: slug, selectedAccountCount: data.accounts.length, verifiedDeliveryCount: data.deliveryMethods.length });
  return data;
}
