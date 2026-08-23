import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { signUp } from "../actions";
import { login } from "../actions";
import { unifiedAuthNext } from "@/lib/public-auth-intent";
import { redirect } from "next/navigation";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  if (params.mode !== "signin" && params.mode !== "signup") {
    const query = new URLSearchParams({ mode: "signup" });
    if (params.intent === "pro") query.set("intent", "pro");
    if (params.interval === "monthly" || params.interval === "yearly") query.set("interval", params.interval);
    if (typeof params.next === "string") query.set("next", params.next);
    redirect(`/register?${query}`);
  }
  const mode = params.mode === "signin" ? "signin" : "signup";
  const next = unifiedAuthNext({ intent: typeof params.intent === "string" ? params.intent : undefined, interval: typeof params.interval === "string" ? params.interval : undefined, next: typeof params.next === "string" ? params.next : undefined });
  const proIntent = typeof params.intent === "string" && params.intent === "pro" && (params.interval === "monthly" || params.interval === "yearly");
  const intentQuery = proIntent ? `&intent=pro&interval=${params.interval}` : `&next=${encodeURIComponent(next)}`;
  return <section className="auth-card register-card">
    <p className="eyebrow mb-3">{proIntent ? "Protection plan" : mode === "signin" ? "Welcome back" : "Start protecting"}</p>
    <h1 className="text-3xl font-semibold tracking-[-.035em]">{proIntent ? "Continue to AudienceOwn Pro" : mode === "signin" ? "Sign in to AudienceOwn" : "Create Your AudienceOwn"}</h1>
    <p className="mb-5 mt-2 text-sm leading-6 text-zinc-400">{proIntent ? "Sign in or create your AudienceOwn account to continue with Pro." : mode === "signin" ? "Manage your protection system and stay connected to your audience." : "Start with your permanent creator identity and build your protection system from there."}</p>
    <nav className="auth-mode-switch" aria-label="Authentication mode"><Link aria-current={mode === "signup" ? "page" : undefined} href={`/register?mode=signup${intentQuery}`}>Create account</Link><Link aria-current={mode === "signin" ? "page" : undefined} href={`/register?mode=signin${intentQuery}`}>Sign in</Link></nav>
    <GoogleAuthButton next={next} />
    <div className="auth-divider"><span>or continue with email</span></div>
    <AuthForm action={mode === "signin" ? login : signUp} mode={mode === "signin" ? "login" : "signup"} next={next}/>
    <p className="mt-5 text-xs leading-5 text-zinc-500">By continuing, you agree to our <Link href="/terms" className="text-zinc-300 hover:text-white">Terms</Link> and acknowledge our <Link href="/privacy" className="text-zinc-300 hover:text-white">Privacy Policy</Link>.</p>
    <p className="mt-6 text-center text-sm text-zinc-400">{mode === "signin" ? <>New to AudienceOwn? <Link href={`/register?mode=signup${intentQuery}`} className="font-medium text-violet-300 hover:text-violet-200">Create an account</Link></> : <>Already have an account? <Link href={`/register?mode=signin${intentQuery}`} className="font-medium text-violet-300 hover:text-violet-200">Sign in</Link></>}</p>
  </section>;
}
