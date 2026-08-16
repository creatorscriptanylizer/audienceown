export function AutomationSummary({ destinations, incidents, destinationsAvailable = true, incidentsAvailable = true }: {
  destinations: Array<{ automation_enabled: boolean; automation_paused_at: string | null }>;
  incidents: Array<{ status: string }>;
  destinationsAvailable?: boolean;
  incidentsAvailable?: boolean;
}) {
  const active = destinations.filter((item) => item.automation_enabled && !item.automation_paused_at).length;
  const paused = destinations.filter((item) => item.automation_paused_at).length;
  const open = incidents.filter((item) => ["open", "acknowledged", "investigating"].includes(item.status)).length;
  const metrics: Array<[string, number | null]> = [
    ["Active", destinationsAvailable ? active : null],
    ["Needs review", incidentsAvailable ? open : null],
    ["Paused", destinationsAvailable ? paused : null],
  ];
  return <section><p className="eyebrow">Automation</p><h2 className="mt-2 text-xl font-semibold">Continuous destination maintenance</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{metrics.map(([label, value]) => <div className="surface rounded-xl p-4" key={label}><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value ?? "—"}</p>{value === null && <small className="text-xs text-zinc-500">Temporarily unavailable</small>}</div>)}</div></section>;
}
