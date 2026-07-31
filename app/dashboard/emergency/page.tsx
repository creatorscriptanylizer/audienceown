import { EmergencyWorkspace } from "@/components/emergency-workspace";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function EmergencyPage() {
  const creator = await requireCreator();
  const supabase = await createClient();
  const [{data:accounts},{data:emergencies},{data:deliveries},{data:templates},{data:plans},{data:drills}] = supabase
    ? await Promise.all([supabase.from("connected_accounts").select("id,account_type,platform,label,url,is_primary,external_account_id,connection_health,provider_status").eq("creator_id", creator.id),
      supabase.from("creator_emergencies").select("id,emergency_type,lifecycle_status,severity,title,message,updated_at,creator_update_id,emergency_affected_accounts(display_handle,provider),emergency_replacement_accounts(id,display_handle,provider,canonical_profile_url,stable_provider_account_id,verification_state,verification_method,verification_confidence,official,verified_at,last_revalidated_at,next_revalidation_at,revalidation_status),emergency_events(id,event_type,created_at)")
        .eq("creator_id",creator.id).order("updated_at",{ascending:false}),
      supabase.from("update_deliveries").select("update_id,status,transport").eq("creator_id",creator.id),
      supabase.from("emergency_templates").select("*").eq("creator_id",creator.id).order("updated_at",{ascending:false}),
      supabase.from("emergency_plans").select("*").eq("creator_id",creator.id).order("updated_at",{ascending:false}),
      supabase.from("emergency_drills").select("*").eq("creator_id",creator.id).order("created_at",{ascending:false})])
    : [{data:[]},{data:[]},{data:[]},{data:[]},{data:[]},{data:[]}];
  const connectedAccounts = accounts ?? [];
  const primaryDestination = connectedAccounts.find((account) => account.is_primary);

  return <EmergencyWorkspace accounts={(connectedAccounts.filter(a=>a.account_type==="official"))} emergencies={(emergencies??[])as never[]} deliveries={deliveries??[]} templates={templates??[]} plans={(plans??[])as never[]} drills={(drills??[])as never[]} readiness={{
    recoveryPassEnabled: creator.recovery_pass_enabled,
    creatorPageLive: creator.public_profile_enabled,
    profileCompleted: Boolean(creator.display_name && creator.public_slug && creator.public_bio),
    connectedPlatformCount: connectedAccounts.length,
    backupPlatformCount: connectedAccounts.filter((account) => account.account_type === "backup").length,
    primaryDestinationLabel: primaryDestination?.label ?? null,
  }}/>;
}
