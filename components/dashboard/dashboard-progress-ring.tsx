type DashboardProgressRingProps = {
  value: number;
  label: string;
  tone?: "violet" | "cyan" | "green";
  size?: "sm" | "lg";
};

const tones = {
  violet: { stroke: "#9b7cff", glow: "rgba(139,92,246,.42)" },
  cyan: { stroke: "#38bdf8", glow: "rgba(56,189,248,.35)" },
  green: { stroke: "#34d399", glow: "rgba(52,211,153,.32)" },
};

export function DashboardProgressRing({ value, label, tone = "violet", size = "sm" }: DashboardProgressRingProps) {
  const bounded = Math.min(100, Math.max(0, value));
  const radius = 42;
  const ring = tones[tone];
  const dimensions = size === "lg" ? "h-[116px] w-[116px]" : "h-[78px] w-[78px]";

  return (
    <div className={`dashboard-progress-ring relative grid shrink-0 place-items-center ${dimensions}`} aria-label={`${label}: ${bounded}%`}>
      <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 -rotate-90 overflow-visible">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.075)" strokeWidth="7" />
        <circle
          className="dashboard-progress-ring-value"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          pathLength="100"
          stroke={ring.stroke}
          strokeDasharray="100"
          strokeDashoffset={100 - bounded}
          strokeLinecap="round"
          strokeWidth="7"
          style={{ filter: `drop-shadow(0 0 6px ${ring.glow})` }}
        />
      </svg>
      <span className={size === "lg" ? "text-2xl font-semibold tracking-tight" : "text-sm font-semibold"}>{bounded}%</span>
    </div>
  );
}
