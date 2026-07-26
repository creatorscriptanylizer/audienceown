import { integrationStatus } from "@/lib/env";
export function ConfigNotice() {
  const status = integrationStatus();
  if (status.supabase) return null;
  return <div role="status" className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
    OwnSignal needs Supabase configuration before account actions can run. See <code>.env.example</code>.
  </div>;
}
