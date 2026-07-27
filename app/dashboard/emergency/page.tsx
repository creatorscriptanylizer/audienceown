import { EmergencyWorkspace } from "@/components/emergency-workspace";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function EmergencyPage() {
  const creator = await requireCreator();
  const supabase = await createClient();
  const { data: accounts } = supabase
    ? await supabase.from("connected_accounts").select("account_type,label,is_primary").eq("creator_id", creator.id)
    : { data: [] };
  const connectedAccounts = accounts ?? [];
  const primaryDestination = connectedAccounts.find((account) => account.is_primary);

  return <EmergencyWorkspace readiness={{
    recoveryPassEnabled: creator.recovery_pass_enabled,
    creatorPageLive: creator.public_profile_enabled,
    profileCompleted: Boolean(creator.display_name && creator.public_slug && creator.public_bio),
    connectedPlatformCount: connectedAccounts.length,
    backupPlatformCount: connectedAccounts.filter((account) => account.account_type === "backup").length,
    primaryDestinationLabel: primaryDestination?.label ?? null,
  }}/>;
}
