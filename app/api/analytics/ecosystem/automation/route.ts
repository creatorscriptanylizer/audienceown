import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const creator = await requireCreator();
  const db = await createClient();
  if (!db) return Response.json({ error: "Unavailable" }, { status: 503 });
  const [{ data: actionsData }, { data: incidentsData }, { data: observationsData }, { data: destinationsData }] = await Promise.all([
    db.from("ecosystem_automation_actions").select("action_type,status,created_at,destination:creator_ecosystem_destinations(provider)").eq("creator_id", creator.id),
    db.from("ecosystem_automation_incidents").select("incident_type,severity,status,created_at,acknowledged_at,resolved_at,destination:creator_ecosystem_destinations(provider)").eq("creator_id", creator.id),
    db.from("ecosystem_sync_observations").select("source,status,observation_type").eq("creator_id", creator.id),
    db.from("creator_ecosystem_destinations").select("automation_paused_at,last_failure_class").eq("creator_id", creator.id),
  ]);
  const actions=actionsData??[],incidents=incidentsData??[],observations=observationsData??[],destinations=destinationsData??[];
  const acknowledgeTimes=incidents.flatMap(i=>i.acknowledged_at?[Date.parse(i.acknowledged_at)-Date.parse(i.created_at)]:[]);
  const resolutionTimes=incidents.flatMap(i=>i.resolved_at?[Date.parse(i.resolved_at)-Date.parse(i.created_at)]:[]);
  return Response.json({automaticSyncRuns:observations.filter(x=>x.source==="polling").length,successfulSyncs:observations.filter(x=>x.observation_type==="destination_confirmed").length,failures:destinations.filter(x=>x.last_failure_class).length,safeChangesApplied:actions.filter(x=>x.action_type==="metadata_updated").length,incidents:incidents.length,webhookEventsProcessed:observations.filter(x=>x.source==="provider_webhook"&&x.status==="processed").length,pollingFallbackRuns:observations.filter(x=>x.source==="polling").length,verificationRevocations:actions.filter(x=>x.action_type==="verification_revoked").length,verificationRecoveries:observations.filter(x=>x.observation_type==="verification_restored").length,publicSuppressions:actions.filter(x=>x.action_type==="public_presentation_suppressed").length,trustReevaluations:actions.filter(x=>x.action_type==="trust_reevaluation_queued").length,authenticityRefreshes:actions.filter(x=>x.action_type==="authenticity_refresh_queued").length,pausedDestinations:destinations.filter(x=>x.automation_paused_at).length,meanTimeToAcknowledgeMs:mean(acknowledgeTimes),meanTimeToResolveMs:mean(resolutionTimes)},{headers:{"cache-control":"private, no-store"}});
}
function mean(values:number[]){return values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length):null;}
