import { PlatformsManager } from "@/components/platforms-manager";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const creator = await requireCreator();
  const supabase = (await createClient())!;
  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("id,platform,account_type,label,url,is_primary,is_public,position")
    .eq("creator_id", creator.id)
    .order("position");

  return <>
    <header className="platforms-page-header">
      <p className="eyebrow">Your presence</p>
      <h1>Platforms</h1>
      <p>Manage your official and backup accounts so fans always know where to find you.</p>
    </header>
    <PlatformsManager accounts={accounts ?? []}/>
  </>;
}
