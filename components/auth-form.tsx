"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import type { AuthState } from "@/app/(auth)/actions";
import { resendSignupConfirmation } from "@/app/(auth)/actions";

const RESEND_COOLDOWN_SECONDS = 60;

export function AuthForm({ action, mode, next }: { action: (state: AuthState, data: FormData) => Promise<AuthState>; mode: "login" | "signup" | "forgot" | "reset"; next?: string }) {
  const [state, formAction] = useActionState(action, {});
  const [showPassword, setShowPassword] = useState(false);
  const [resendState, setResendState] = useState<AuthState>({});
  const [cooldown, setCooldown] = useState(0);
  const [resendPending, startResend] = useTransition();
  const isPassword = mode !== "forgot";
  const confirmationState = state.kind === "confirmation_required" || state.kind === "resent" || state.kind === "repeated_signup";
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function resend() {
    if (!state.email || resendPending || cooldown > 0) return;
    const data = new FormData();
    data.set("email", state.email);
    data.set("next", state.next ?? "/onboarding");
    startResend(async () => {
      const result = await resendSignupConfirmation(data);
      setResendState(result);
      if (result.kind === "resent") setCooldown(RESEND_COOLDOWN_SECONDS);
    });
  }

  if (mode === "signup" && confirmationState) {
    const repeated = state.kind === "repeated_signup";
    const signInHref = `/register?mode=signin&next=${encodeURIComponent(state.next ?? "/dashboard")}`;
    return <section className="space-y-4" aria-live="polite">
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-5">
      <h2 className="text-xl font-semibold text-white">{resendState.title ?? state.title ?? "Check Your Inbox"}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{resendState.message ?? state.message}</p>
    </div>
    {resendState.error && <div role="alert" className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100"><strong className="block">{resendState.title}</strong><span className="mt-1 block">{resendState.error}</span></div>}
    {repeated && <Link href={signInHref} className="button button-primary w-full">Sign in</Link>}
    <button type="button" className="button button-secondary w-full" onClick={resend} disabled={resendPending || cooldown > 0}>
      {resendPending ? "Sending…" : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend confirmation email"}
    </button>
    {!repeated && <p className="text-center text-sm text-zinc-400">Already confirmed? <Link href={signInHref} className="font-medium text-violet-300 hover:text-violet-200">Sign in</Link></p>}
  </section>;
  }
  return <form action={formAction} className="space-y-4">
    {(mode === "login" || mode === "signup") && <input type="hidden" name="next" value={next ?? (mode === "signup" ? "/onboarding" : "/dashboard")}/>}
    {mode !== "reset" && <div><label className="label" htmlFor="email">Email address</label><input className="input" id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>}
    {isPassword && <div><label className="label" htmlFor="password">{mode === "reset" ? "New password" : "Password"}</label><div className="password-input-wrap"><input className="input" id="password" name="password" type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "signup" ? "Create a strong password" : undefined} required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</button></div></div>}
    {mode === "login" && <div className="text-right"><Link href="/forgot-password" className="text-sm text-zinc-400 transition hover:text-white">Forgot password?</Link></div>}
    {state.error && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{state.title && <strong className="block">{state.title}</strong>}<span className={state.title ? "mt-1 block" : undefined}>{state.error}</span></div>}
    {state.message && <p role="status" className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">{state.message}</p>}
    <SubmitButton className={mode === "signup" ? "button register-submit w-full" : undefined} pendingText={mode === "login" ? "Signing in…" : mode === "signup" ? "Creating your AudienceOwn…" : mode === "forgot" ? "Sending reset link…" : "Updating password…"}>{mode === "login" ? "Sign in" : mode === "signup" ? <span className="register-submit-label">Create My AudienceOwn <ArrowRight aria-hidden /></span> : mode === "forgot" ? "Send reset link" : "Update password"}</SubmitButton>
    {mode === "signup" && <p className="register-trust-copy"><ShieldCheck aria-hidden />Your creator identity and connections stay under your control.</p>}
  </form>;
}
