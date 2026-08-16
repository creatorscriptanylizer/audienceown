import { EmergencyWorkspace } from "@/components/emergency-workspace";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { logPageQueryFailure } from "@/lib/data-availability";
import { calculateRecoveryReadiness } from "@/lib/recovery-readiness";

export default async function EmergencyPage() {
  const creator = await requireCreator();
  const supabase = await createClient();
  const results = supabase
    ? await Promise.all([supabase.from("connected_accounts").select("id,account_type,platform,label,url,is_primary,external_account_id,connection_health,provider_status").eq("creator_id", creator.id),
      supabase.from("creator_emergencies").select("id,emergency_type,lifecycle_status,severity,title,message,updated_at,creator_update_id,emergency_affected_accounts(display_handle,provider),emergency_replacement_accounts(id,display_handle,provider,canonical_profile_url,stable_provider_account_id,verification_state,verification_method,verification_confidence,official,verified_at,last_revalidated_at,next_revalidation_at,revalidation_status),emergency_events(id,event_type,created_at)")
        .eq("creator_id",creator.id).order("updated_at",{ascending:false}),
      supabase.from("update_deliveries").select("update_id,status,transport").eq("creator_id",creator.id),
      supabase.from("emergency_templates").select("*").eq("creator_id",creator.id).order("updated_at",{ascending:false}),
      supabase.from("emergency_plans").select("*").eq("creator_id",creator.id).order("updated_at",{ascending:false}),
      supabase.from("emergency_drills").select("*").eq("creator_id",creator.id).order("created_at",{ascending:false}),
      supabase.from("creator_identity_accounts").select("official,account_kind,verification_status").eq("creator_id",creator.id)])
    : null;
  if (!results) throw new Error("Supabase is not configured");
  const [accountsResult,emergenciesResult,deliveriesResult,templatesResult,plansResult,drillsResult,identityAccountsResult] = results;
  const names=["connected_accounts","emergencies","delivery_history","templates","plans","drills","identity_accounts"];
  results.forEach((result,index)=>logPageQueryFailure("emergency",names[index],result.error));
  const {data:accounts}=accountsResult,{data:emergencies}=emergenciesResult,{data:deliveries}=deliveriesResult,{data:templates}=templatesResult,{data:plans}=plansResult,{data:drills}=drillsResult;
  const connectedAccounts = accounts ?? [];
  const primaryDestination = connectedAccounts.find((account) => account.is_primary);
  const identityAccounts=identityAccountsResult.data??[];
  const recoveryReadiness=calculateRecoveryReadiness({
    page:creator.public_profile_enabled?"complete":"incomplete",
    pass:creator.recovery_pass_enabled?"complete":"incomplete",
    official:identityAccountsResult.error?"unavailable":identityAccounts.some(account=>account.official&&account.verification_status==="verified")?"complete":"incomplete",
    backup:identityAccountsResult.error?"unavailable":identityAccounts.some(account=>account.account_kind==="backup"&&account.verification_status==="verified")?"complete":"incomplete",
    plan:plansResult.error?"unavailable":plans?.[0]?.readiness_status==="ready"?"complete":"incomplete",
  });

  return <EmergencyWorkspace availability={{accounts:!accountsResult.error,emergencies:!emergenciesResult.error,deliveries:!deliveriesResult.error,preparedness:!templatesResult.error&&!plansResult.error&&!drillsResult.error}} accounts={(connectedAccounts.filter(a=>a.account_type==="official"))} emergencies={(emergencies??[])as never[]} deliveries={deliveries??[]} templates={templates??[]} plans={(plans??[])as never[]} drills={(drills??[])as never[]} readiness={recoveryReadiness} primaryDestinationLabel={primaryDestination?.label??null}/>;
}
