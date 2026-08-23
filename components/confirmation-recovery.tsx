"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { resendSignupConfirmation, type AuthState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";

const COOLDOWN_SECONDS = 60;

export function ConfirmationRecovery({ next, confirmed = false }: { next: string; confirmed?: boolean }) {
  const [cooldown, setCooldown] = useState(0);
  const [state, formAction] = useActionState(async (_: AuthState, data: FormData) => {
    const result = await resendSignupConfirmation(data);
    if (result.kind === "resent") setCooldown(COOLDOWN_SECONDS);
    return result;
  }, {});

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const signInHref = `/register?mode=signin&next=${encodeURIComponent(next)}`;
  return <section className="space-y-5">
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-5">
      <h2 className="text-xl font-semibold text-white">{confirmed ? "Your Email Is Already Confirmed" : "This Confirmation Link Is No Longer Active"}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{confirmed ? "Your AudienceOwn account is ready. Sign in to continue." : "If you’ve already confirmed your email, sign in to continue. If you haven’t, request a new confirmation email."}</p>
    </div>
    <Link href={signInHref} className="button button-primary w-full">Sign in to AudienceOwn</Link>
    {!confirmed && <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next}/>
      <div><label className="label" htmlFor="confirmation-email">Email address</label><input className="input" id="confirmation-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></div>
      {state.error && <p role="alert" className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">{state.error}</p>}
      {state.message && <p role="status" className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100"><strong className="block">{state.title}</strong><span className="mt-1 block">{state.message}</span></p>}
      <SubmitButton className="button button-secondary w-full" pendingText="Sending…" disabled={cooldown > 0}>{cooldown > 0 ? `Send again in ${cooldown}s` : "Send a New Confirmation Email"}</SubmitButton>
    </form>}
  </section>;
}
