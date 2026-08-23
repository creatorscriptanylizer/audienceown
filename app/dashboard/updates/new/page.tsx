import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AlertComposer } from "@/components/broadcast-studio/broadcast-studio";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { parseBroadcastTypeQuery } from "@/lib/updates";
import { logPageQueryFailure } from "@/lib/data-availability";

export default async function NewUpdatePage({ searchParams }: PageProps<"/dashboard/updates/new">) {
  const creator = await requireCreator();
  const { type, intent } = await searchParams;
  const initialEntryIntent = intent === "emergency" ? "emergency" : "update";
  const supabase = await createClient();
  const [accountsResult,networksResult] = supabase ? await Promise.all([supabase.from("connected_accounts")
    .select("id,platform,account_type,label,url,is_primary,is_public,position,external_account_id,connection_health,provider_status")
    .eq("creator_id", creator.id).order("position"),supabase.from("recovery_networks").select("main_connected_account_id,recovery_network_destinations(recovery_connected_account_id)").eq("creator_id",creator.id)]) : [{ data: null, error: new Error("Database unavailable") },{data:null,error:new Error("Database unavailable")}];
  const recoveryRelationships=(networksResult.data??[]).flatMap(network=>network.main_connected_account_id?network.recovery_network_destinations.map(link=>({main_connected_account_id:network.main_connected_account_id!,recovery_connected_account_id:link.recovery_connected_account_id})):[]);
  logPageQueryFailure("dashboard/updates/new", "connected_accounts", accountsResult.error);
  return <>
    <Link href="/dashboard/updates" className="update-back-link"><ArrowLeft size={15}/> Update history</Link>
    <AlertComposer
      initialBroadcastType={parseBroadcastTypeQuery(type)}
      initialEntryIntent={initialEntryIntent}
      creator={{ displayName: creator.display_name, publicSlug: creator.public_slug ?? "" }}
      accounts={accountsResult.data ?? []}
      recoveryRelationships={recoveryRelationships}
      accountsAvailable={!accountsResult.error}
      estimate={null}
    />
  </>;
}
