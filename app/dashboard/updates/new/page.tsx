import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BroadcastStudio } from "@/components/broadcast-studio/broadcast-studio";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { parseBroadcastTypeQuery } from "@/lib/updates";
import { logPageQueryFailure } from "@/lib/data-availability";

export default async function NewUpdatePage({ searchParams }: PageProps<"/dashboard/updates/new">) {
  const creator = await requireCreator();
  const { type } = await searchParams;
  const supabase = await createClient();
  const accountsResult = supabase ? await supabase.from("connected_accounts")
    .select("id,platform,account_type,label,url,is_primary,is_public,position")
    .eq("creator_id", creator.id).order("position") : { data: null, error: new Error("Database unavailable") };
  logPageQueryFailure("dashboard/updates/new", "connected_accounts", accountsResult.error);
  return <>
    <Link href="/dashboard/updates" className="update-back-link"><ArrowLeft size={15}/> Update history</Link>
    <BroadcastStudio
      initialBroadcastType={parseBroadcastTypeQuery(type)}
      creator={{ displayName: creator.display_name, publicSlug: creator.public_slug ?? "" }}
      accounts={accountsResult.data ?? []}
      accountsAvailable={!accountsResult.error}
      estimate={null}
    />
  </>;
}
