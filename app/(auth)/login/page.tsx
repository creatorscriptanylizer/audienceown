import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { LOCAL_GOOGLE_UNAVAILABLE, safeNextPath, shouldOfferGoogle } from "@/lib/auth-flow";

const errors: Record<string, string> = {
  google_not_configured: LOCAL_GOOGLE_UNAVAILABLE,
  oauth: "Google sign-in could not be started. Try again or use email.",
  callback: "Sign-in could not be completed. Please try again.",
  missing_code: "The sign-in link is incomplete or expired. Please try again.",
  configuration: "Authentication is not configured yet.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const offerGoogle = shouldOfferGoogle();
  const error = typeof params.error === "string" ? errors[params.error] : undefined;
  return <section className="auth-card">
  <p className="eyebrow mb-3">Welcome back</p>
  <h1 className="text-3xl font-semibold tracking-[-.035em]">Sign in to AudienceOwn</h1>
  <p className="mb-7 mt-2 text-sm leading-6 text-zinc-400">Manage your page and stay connected to your audience.</p>
  {error && <p role="alert" className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">{error}</p>}
  {offerGoogle ? <GoogleAuthButton next={next}/> : <p className="mb-4 rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm text-cyan-100">{LOCAL_GOOGLE_UNAVAILABLE} Use the local email/password account below.</p>}
  <div className="auth-divider"><span>or continue with email</span></div>
  <AuthForm action={login} mode="login" next={next}/>
  <p className="mt-7 text-center text-sm text-zinc-400">New to AudienceOwn? <Link href="/register" className="font-medium text-violet-300 hover:text-violet-200">Create your page</Link></p>
</section>; }
