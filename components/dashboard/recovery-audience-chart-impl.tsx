"use client";

import { useMemo, useState } from "react";
import { Share2, Users } from "lucide-react";
import type { RecoveryAudienceRange, RecoveryAudienceSummary } from "@/lib/recovery-audience";
import { RecoveryPassShareButton } from "./recovery-pass-card";

const ranges: Array<{ key: RecoveryAudienceRange; label: string }> = [
  { key: "7d", label: "7 Days" }, { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" }, { key: "all", label: "All Time" },
];

const number = new Intl.NumberFormat("en-US");
const chartDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const accessibleDate = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const formatDate = (value: string, formatter: Intl.DateTimeFormat) => formatter.format(new Date(`${value}T00:00:00Z`));

function RecoveryChartEmpty({ recoveryPassUrl }: { recoveryPassUrl?: string | null }) {
  return <div className="recovery-chart-empty">
    <div className="recovery-chart-empty-icon" aria-hidden="true"><Users/><Share2/></div>
    <strong>No protected audience yet</strong>
    <p>Share your Recovery Pass to start building your recovery network.</p>
    {recoveryPassUrl ? <RecoveryPassShareButton url={recoveryPassUrl} className="premium-secondary-action"/> : null}
  </div>;
}

export function RecoveryAudienceChartImpl({ summaries, recoveryPassUrl }: { summaries: Record<RecoveryAudienceRange, RecoveryAudienceSummary>; recoveryPassUrl?: string | null }) {
  const [range, setRange] = useState<RecoveryAudienceRange>("30d");
  const [active, setActive] = useState<number | null>(null);
  const summary = summaries[range];
  const points = summary.growth.points;
  const geometry = useMemo(() => {
    const max = Math.max(1, ...points.map((point) => point.protectedAudience));
    return points.map((point, index) => ({ ...point,
      x: points.length < 2 ? 50 : index / (points.length - 1) * 100,
      y: 92 - point.protectedAudience / max * 78,
    }));
  }, [points]);
  const line = geometry.map((point) => `${point.x},${point.y}`).join(" ");
  const selected = active === null ? null : geometry[active];
  const hasAudience = points.length > 0 && points.some((point) => point.protectedAudience > 0);

  return <section className="premium-dashboard-panel recovery-growth-panel" aria-labelledby="recovery-growth-title">
    <header className="recovery-chart-header"><div><p className="premium-eyebrow">Recovery Pass</p><h2 id="recovery-growth-title">Audience Growth</h2><p>Unique protected participants attributed from destination selections.</p></div><div className="recovery-range-tabs" aria-label="Audience growth range">{ranges.map((item) => <button type="button" key={item.key} aria-pressed={range === item.key} onClick={() => { setRange(item.key); setActive(null); }}>{item.label}</button>)}</div></header>
    {hasAudience ? <div className="recovery-chart-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Recovery Pass protected audience over ${ranges.find((item) => item.key === range)?.label}`}>
        <defs><linearGradient id="recovery-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".34"/><stop offset="1" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient></defs>
        <path d={`M ${geometry[0].x} 96 L ${line.replaceAll(" ", " L ")} L ${geometry.at(-1)!.x} 96 Z`} fill="url(#recovery-area)"/>
        <polyline points={line} fill="none" stroke="#a78bfa" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {geometry.map((point, index) => <button key={`${point.date}-${index}`} type="button" className="recovery-chart-point" style={{ left: `${point.x}%`, top: `${point.y}%` }} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} aria-label={`${formatDate(point.date, accessibleDate)}: ${number.format(point.protectedAudience)} protected participants`}/>) }
      {selected && <div className="recovery-chart-tooltip" style={{ left: `${Math.min(88, Math.max(12, selected.x))}%`, top: `${Math.max(5, selected.y - 24)}%` }} role="status"><strong>{number.format(selected.protectedAudience)}</strong><span>{formatDate(selected.date, chartDate)}</span></div>}
      <div className="recovery-chart-axis"><span>{geometry[0].date}</span><span>{geometry.at(-1)!.date}</span></div>
    </div> : <RecoveryChartEmpty recoveryPassUrl={recoveryPassUrl}/>}
    <p className="sr-only">This chart uses only canonical Recovery Pass destination selection timestamps. Native social follower history is excluded.</p>
  </section>;
}
