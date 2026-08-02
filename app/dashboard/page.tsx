import { CreatorCommandDashboard } from "@/components/dashboard/creator-command-dashboard";
import { requireCreator } from "@/lib/dal";
import { getCreatorDashboard } from "@/lib/dashboard/creator-dashboard";

export default async function Page() {
  const creator = await requireCreator();
  const data = await getCreatorDashboard(creator);
  return <CreatorCommandDashboard data={data}/>;
}
