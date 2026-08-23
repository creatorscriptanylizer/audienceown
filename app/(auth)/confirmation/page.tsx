import { ConfirmationRecovery } from "@/components/confirmation-recovery";
import { safeNextPath } from "@/lib/auth-flow";
import { createClient } from "@/lib/supabase/server";

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null, "/onboarding");
  const currentUser = await (await createClient())?.auth.getUser();
  const alreadyConfirmed = Boolean(currentUser?.data.user?.email_confirmed_at);
  return <section className="auth-card register-card">
    <p className="eyebrow mb-3">Email confirmation</p>
    <h1 className="text-3xl font-semibold tracking-[-.035em]">Continue to AudienceOwn</h1>
    <p className="mb-5 mt-2 text-sm leading-6 text-zinc-400">Use the secure option that matches where you are in confirmation.</p>
    <ConfirmationRecovery next={next} confirmed={alreadyConfirmed}/>
  </section>;
}
