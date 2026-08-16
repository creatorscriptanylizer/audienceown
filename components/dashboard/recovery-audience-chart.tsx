"use client";

import dynamic from "next/dynamic";
import type { RecoveryAudienceRange, RecoveryAudienceSummary } from "@/lib/recovery-audience";

export type RecoveryAudienceChartProps = {
  summaries: Record<RecoveryAudienceRange, RecoveryAudienceSummary>;
  recoveryPassUrl?: string | null;
};

export function RecoveryChartLoadingState() {
  return <section className="premium-dashboard-panel recovery-growth-panel" aria-labelledby="recovery-growth-title" aria-busy="true">
    <header className="recovery-chart-header"><div><p className="premium-eyebrow">Recovery Pass</p><h2 id="recovery-growth-title">Audience Growth</h2><p>Unique protected participants attributed from destination selections.</p></div></header>
    <div className="recovery-chart-wrap" aria-hidden="true"/>
    <p className="sr-only">This chart uses only canonical Recovery Pass destination selection timestamps. Native social follower history is excluded.</p>
  </section>;
}

const RecoveryAudienceChartImpl = dynamic(
  () => import("./recovery-audience-chart-impl").then((module) => module.RecoveryAudienceChartImpl),
  { ssr: false, loading: () => <RecoveryChartLoadingState/> },
);

export function RecoveryAudienceChart(props: RecoveryAudienceChartProps) {
  return <RecoveryAudienceChartImpl {...props}/>;
}
