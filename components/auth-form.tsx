"use client";
import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import type { AuthState } from "@/app/(auth)/actions";

export function AuthForm({ action, mode }: { action: (state: AuthState, data: FormData) => Promise<AuthState>; mode: "login" | "signup" | "forgot" | "reset" }) {
  const [state, formAction] = useActionState(action, {});
  const isPassword = mode !== "forgot";
  return <form action={formAction} className="space-y-4">
    {mode !== "reset" && <div><label className="label" htmlFor="email">Email address</label><input className="input" id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>}
    {isPassword && <div><label className="label" htmlFor="password">{mode === "reset" ? "New password" : "Password"}</label><input className="input" id="password" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div>}
    {mode === "login" && <div className="text-right"><Link href="/forgot-password" className="text-sm text-zinc-400 transition hover:text-white">Forgot password?</Link></div>}
    {state.error && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{state.error}</p>}
    {state.message && <p role="status" className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">{state.message}</p>}
    <SubmitButton pendingText={mode === "login" ? "Signing in…" : "Creating your page…"}>{mode === "login" ? "Sign in" : mode === "signup" ? "Create your page" : mode === "forgot" ? "Send reset link" : "Update password"}</SubmitButton>
  </form>;
}
