import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePreferenceCategory, type RecipientCandidate } from "@/lib/update-recipients";
import { calculatePlanReadiness } from "./readiness";
import { simulateRecipientAggregation } from "./simulation";
import type { EmergencySeverity } from "./types";
import type { emergencyApiContext } from "./api";

type Context = NonNullable<Awaited<ReturnType<typeof emergencyApiContext>>>;
type PlanRow = { id:string;creator_id:string;affected_account_id:string|null;template_id:string|null;emergency_type:string;severity:string;title:string;message:string;proposed_replacement_url:string|null;proposed_replacement_provider:string|null;proposed_replacement_handle:string|null };

export async function getPreparednessChecks(ctx: Context, plan: PlanRow) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Preparedness checks are not configured.");
  const [{ data: creator, error: creatorError }, { data: account, error: accountError }, { data: members, error: membersError }] = await Promise.all([
    admin.from("creators").select("owner_user_id,recovery_pass_enabled,public_profile_enabled").eq("id", ctx.creator.id).single(),
    plan.affected_account_id ? admin.from("connected_accounts").select("id").eq("id", plan.affected_account_id).eq("creator_id", ctx.creator.id).eq("account_type", "official").maybeSingle() : Promise.resolve({ data:null, error:null }),
    admin.from("creator_team_members").select("user_id,permissions").eq("creator_id", ctx.creator.id),
  ]);
  if (creatorError || accountError || membersError) throw creatorError ?? accountError ?? membersError;
  const isOwner = creator?.owner_user_id === ctx.user.id;
  const has = (permission: string) => isOwner || (members ?? []).some((member) => member.permissions.includes(permission));
  const currentMember = (members ?? []).find((member) => member.user_id === ctx.user.id);
  const currentUserHas = (permission:string) => isOwner || currentMember?.permissions.includes(permission) === true;
  const separateApprover = (creator?.owner_user_id !== ctx.user.id) || (members ?? []).some((member) => member.user_id !== ctx.user.id && member.permissions.includes("emergency_approve"));
  const readiness = calculatePlanReadiness({
    affectedAccountExists: Boolean(account), templateValid: plan.title.trim().length > 0 && plan.message.trim().length > 0,
    recoveryPassEnabled: creator?.recovery_pass_enabled === true, publicPageEnabled: creator?.public_profile_enabled === true,
    hasManager: has("emergency_manage"), hasActivator: has("emergency_activate"), hasSeparateApprover: separateApprover,
    severity: plan.severity as EmergencySeverity, proposedReplacementUrl: plan.proposed_replacement_url, replacementVerified: false,
  });
  return { readiness, separateApprover, activationAvailable: currentUserHas("emergency_activate") };
}

export async function validatePlan(ctx: Context, plan: PlanRow) {
  const checks = await getPreparednessChecks(ctx, plan);
  const admin = createAdminClient();
  if (!admin) throw new Error("Preparedness checks are not configured.");
  const { error } = await admin.from("emergency_plans").update({ readiness_status: checks.readiness.status, readiness_result: { blockers: checks.readiness.blockers, warnings: checks.readiness.warnings }, last_validated_at: checks.readiness.checkedAt }).eq("id", plan.id).eq("creator_id", ctx.creator.id);
  if (error) throw error;
  return checks;
}

export async function simulatePreparedDelivery(creatorId: string, affectedAccountId: string | null): Promise<ReturnType<typeof simulateRecipientAggregation>> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Drill simulation is not configured.");
  if (!affectedAccountId) throw new Error("The prepared plan needs another official account before it can run.");
  const { data: account, error: accountError } = await admin.from("connected_accounts").select("platform").eq("id",affectedAccountId).eq("creator_id",creatorId).eq("account_type","official").single();
  if (accountError) throw accountError;
  const { data: connections, error } = await admin.from("follower_connections").select("id,creator_id,follower_contact_id,status,selected_recovery_method_id").eq("creator_id", creatorId).eq("source_platform",account.platform);
  if (error) throw error;
  const rows = connections ?? [];
  const contactIds = [...new Set(rows.map((row) => row.follower_contact_id))];
  const connectionIds = rows.map((row) => row.id);
  const [{ data: methods, error: methodsError }, { data: preferences, error: preferencesError }] = await Promise.all([
    contactIds.length ? admin.from("follower_recovery_methods").select("id,follower_contact_id,method_type,method_status,destination_hash,provider_identifier").in("follower_contact_id", contactIds) : Promise.resolve({ data: [], error:null }),
    connectionIds.length ? admin.from("follower_category_preferences").select("follower_connection_id,enabled").in("follower_connection_id", connectionIds).eq("category_key", resolvePreferenceCategory("account_update")) : Promise.resolve({ data: [], error:null }),
  ]);
  if (methodsError || preferencesError) throw methodsError ?? preferencesError;
  const methodMap = new Map<string, NonNullable<typeof methods>>();
  for (const method of methods ?? []) methodMap.set(method.follower_contact_id, [...(methodMap.get(method.follower_contact_id) ?? []), method]);
  const preferenceMap = new Map((preferences ?? []).map((row) => [row.follower_connection_id, row.enabled]));
  const candidates: RecipientCandidate[] = rows.map((row) => ({
    connectionId: row.id, contactId: row.follower_contact_id, creatorId: row.creator_id, expectedCreatorId: creatorId,
    connectionStatus: row.status as RecipientCandidate["connectionStatus"], selectedRecoveryMethodId: row.selected_recovery_method_id,
    preferenceEnabled: preferenceMap.get(row.id) === true, existingTransports: [], destinations: (methodMap.get(row.follower_contact_id) ?? []).map((method) => ({
      recoveryMethodId: method.id, contactId: method.follower_contact_id, methodType: method.method_type,
      value: method.method_type === "email" ? "simulation@example.com" : method.method_type === "sms" || method.method_type === "whatsapp" ? "+15555550100" : method.provider_identifier ? "simulation-subscription" : null,
      destinationHash: method.destination_hash, verified: method.method_status === "verified", active: method.method_status === "verified" && (method.method_type !== "web_push" || Boolean(method.provider_identifier)),
    })),
  }));
  return simulateRecipientAggregation(candidates);
}

export function recentReauthentication(user: Context["user"]) {
  const raw = user.app_metadata?.reauthenticated_at ?? user.user_metadata?.reauthenticated_at;
  const value = typeof raw === "number" ? raw * 1000 : typeof raw === "string" ? (Number(raw) * 1000 || Date.parse(raw)) : 0;
  return value > Date.now() - 15 * 60 * 1000;
}

export function missingDeliveryProviders(transports: Record<string, number>) {
  const missing: string[] = [];
  if (transports.email > 0 && !process.env.RESEND_API_KEY) missing.push("email");
  if ((transports.sms > 0 || transports.whatsapp > 0) && (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)) missing.push("twilio");
  if (transports.browser_notification > 0 && (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)) missing.push("browser notifications");
  return missing;
}
