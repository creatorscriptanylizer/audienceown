"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveRecoveryAnalytics as Snapshot } from "@/lib/live-recovery-analytics";
import type { RecoveryIncidentOption } from "@/lib/recovery-analytics-server";
import { liveMetricEntries } from "@/lib/live-recovery-analytics";
import { RecoveryKpiCard } from "./recovery-kpi-card";
import { LiveRecoveryFunnel } from "./recovery-funnel";

const STALE_MS = 45_000;
export function LiveRecoveryAnalytics({ incidents, initial, selectedId }: { incidents: RecoveryIncidentOption[]; initial: Snapshot | null; selectedId: string | null }) {
  const [data, setData] = useState(initial), [warning, setWarning] = useState<string | null>(null), [refreshing, setRefreshing] = useState(false), [clock, setClock] = useState(() => initial ? new Date(initial.calculatedAt).getTime() : 0);
  const abort = useRef<AbortController | null>(null), busy = useRef(false), failures = useRef(0);
  const refresh = useCallback(async () => {
    if (!selectedId || busy.current) return; busy.current = true; setRefreshing(true); abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    try { const response = await fetch(`/api/analytics/recovery/incidents/${selectedId}/live`, { cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error("request_failed"); const body = await response.json() as { data: Snapshot }; setData(body.data); setWarning(null); failures.current = 0; setClock(Date.now()); }
    catch (error) { if ((error as Error).name !== "AbortError") { failures.current++; setWarning("Live refresh failed. Showing the last successful snapshot."); } }
    finally { busy.current = false; setRefreshing(false); }
  }, [selectedId]);
  const active = data?.status === "active";
  useEffect(() => {
    if (!active) return; let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { if (document.visibilityState === "visible") timer = setTimeout(async () => { await refresh(); schedule(); }, Math.min(60_000, 12_000 * 2 ** Math.min(failures.current, 3))); };
    const visibility = () => { clearTimeout(timer); if (document.visibilityState === "visible") { void refresh(); schedule(); } };
    schedule(); document.addEventListener("visibilitychange", visibility); const staleClock = setInterval(() => setClock(Date.now()), 15_000);
    return () => { clearTimeout(timer); clearInterval(staleClock); document.removeEventListener("visibilitychange", visibility); abort.current?.abort(); };
  }, [active, refresh]);
  if (!incidents.length) return <section aria-labelledby="live-heading" className="rounded-2xl border border-white/10 p-6"><h2 id="live-heading" className="text-2xl font-semibold">Live Recovery Analytics</h2><p className="mt-3 text-zinc-400">Live recovery metrics will appear after Emergency Mode is activated.</p><Link className="mt-4 inline-block underline" href="/dashboard/emergency">Open Emergency Center</Link></section>;
  const stale = data ? clock - new Date(data.calculatedAt).getTime() > STALE_MS && data.status === "active" : false;
  return <section aria-labelledby="live-heading" className="space-y-6"><div className="rounded-2xl border border-white/10 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Incident-scoped</p><h2 id="live-heading" className="mt-2 text-2xl font-semibold">Live Recovery Analytics</h2>{data && <p className="mt-2 text-sm text-zinc-400">{data.title} · {data.severity} · {data.status}</p>}</div>
    <form><label className="block text-xs text-zinc-400" htmlFor="incident">Incident</label><select id="incident" name="incident" defaultValue={selectedId ?? ""} onChange={(event) => { window.location.assign(`/dashboard/analytics/recovery?incident=${event.target.value}`); }} className="mt-1 rounded-lg border bg-zinc-950 p-2">{incidents.map((incident) => <option key={incident.id} value={incident.id}>{incident.lifecycle_status === "active" ? "Active — " : ""}{incident.title}</option>)}</select></form></div>
    {data && <p className="mt-3 text-xs text-zinc-500">Activated {data.activatedAt ? new Date(data.activatedAt).toLocaleString() : "Unavailable"}{data.resolvedAt ? ` · Resolved ${new Date(data.resolvedAt).toLocaleString()}` : ""} · Last updated {new Date(data.calculatedAt).toLocaleTimeString()}</p>}
    {warning && <div role="status" className="mt-3 rounded-lg border border-amber-400/30 p-3 text-sm"><span>{warning}</span> <button type="button" onClick={() => void refresh()} className="underline">Retry</button></div>}</div>
    {data ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{liveMetricEntries(data).map(([label, metric]) => <RecoveryKpiCard key={label} label={label} metric={metric} stale={stale}/>)}</div><LiveRecoveryFunnel data={data}/>
      <section><h2 className="text-xl font-semibold">Incident transport analytics</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Transport</th><th>Targeted</th><th>Sent</th><th>Delivered</th><th>Failed</th><th>Open coverage</th></tr></thead><tbody>{data.transportBreakdown.map((row) => <tr key={row.transport}><td>{row.transport}</td><td>{row.targeted}</td><td>{row.sent}</td><td>{row.delivered}</td><td>{row.failed}</td><td>Unavailable</td></tr>)}</tbody></table></div>{!data.destinationBreakdown.length && <p className="mt-3 text-sm text-zinc-400">Destination breakdown is unavailable because incident-scoped unique click tracking is not currently measurable.</p>}</section></> : <p>{refreshing ? "Loading live metrics…" : "Live metrics are temporarily unavailable."}</p>}
  </section>;
}
