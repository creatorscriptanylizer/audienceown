export default function SettingsLoading() {
  return <div role="status" aria-label="Loading settings" className="animate-pulse motion-reduce:animate-none">
    <div className="h-3 w-20 rounded bg-white/[.06]"/><div className="mt-4 h-9 w-64 max-w-full rounded-lg bg-white/[.08]"/><div className="mt-3 h-4 w-full max-w-xl rounded bg-white/[.05]"/>
    <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="h-40 rounded-2xl bg-white/[.05]"/><div className="h-40 rounded-2xl bg-white/[.05]"/><div className="h-40 rounded-2xl bg-white/[.05]"/><div className="h-40 rounded-2xl bg-white/[.05]"/></div>
    <span className="sr-only">Loading settings…</span>
  </div>;
}
