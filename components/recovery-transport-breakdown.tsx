type TransportRow = {
  transport: string;
  relationshipCount: { display: string };
  percentageOfTotalAudience: number | null;
  currentlyAvailable: boolean;
};

const labels: Record<string, string> = {
  email: "Email",
  browser_notification: "Browser notifications",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export function RecoveryTransportBreakdown({ rows }: { rows: TransportRow[] }) {
  return <section aria-labelledby="transport-heading">
    <h2 id="transport-heading" className="text-xl font-semibold">Selected Recovery Passes</h2>
    <p className="mt-2 text-sm text-zinc-400">Only currently usable selected methods are counted.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {rows.map((row) => <article key={row.transport} className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3"><strong>{labels[row.transport] ?? row.transport}</strong>
          <span className="text-xs text-zinc-500">{row.currentlyAvailable ? "Available" : "Provider unavailable"}</span></div>
        <span className="mt-3 block text-xl">{row.relationshipCount.display}</span>
        <small className="text-zinc-500">{row.percentageOfTotalAudience === null ? "Percentage suppressed" : `${row.percentageOfTotalAudience}% of total audience`}</small>
      </article>)}
    </div>
  </section>;
}
