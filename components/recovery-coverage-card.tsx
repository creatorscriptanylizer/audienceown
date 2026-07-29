export function RecoveryCoverageCard({
  label,
  value,
  description,
}: { label: string; value: string | number; description: string }) {
  return <article className="rounded-xl border bg-zinc-950 p-4" aria-label={`${label}: ${value}`}>
    <span className="text-xs text-zinc-500">{label}</span>
    <strong className="mt-2 block text-2xl">{value}</strong>
    <p className="mt-2 text-xs leading-5 text-zinc-400">{description}</p>
  </article>;
}
