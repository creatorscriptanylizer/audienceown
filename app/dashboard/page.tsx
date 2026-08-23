import { CreatorCommandDashboard } from "@/components/dashboard/creator-command-dashboard";
import { requireCreator } from "@/lib/dal";
import { getCreatorDashboard } from "@/lib/dashboard/creator-dashboard";
import { getCreatorInsight } from "@/lib/dashboard/creator-insights";
import { getNarratedCreatorInsight } from "@/lib/dashboard/creator-insight-narration";
import { buildCreatorIntelligenceContext } from "@/lib/intelligence/creator-context";
import { getCreatorIntelligenceBrief } from "@/lib/intelligence/creator-recommendations";

export const dynamic = "force-dynamic";

export default async function Page() {
  const creator = await requireCreator();
  const data = await getCreatorDashboard(creator);
  const intelligence = getCreatorIntelligenceBrief(buildCreatorIntelligenceContext(creator, data));
  const insight = await getNarratedCreatorInsight(getCreatorInsight(data));
  return <CreatorCommandDashboard data={data} insight={insight} intelligence={intelligence}/>;
}
