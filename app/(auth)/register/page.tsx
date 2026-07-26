import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { signUp } from "../actions";

export default function RegisterPage() {
  return <section className="auth-card">
    <p className="eyebrow mb-3">Start building</p>
    <h1 className="text-3xl font-semibold tracking-[-.035em]">Create your permanent page</h1>
    <p className="mb-7 mt-2 text-sm leading-6 text-zinc-400">Keep your audience connected wherever you publish.</p>
    <GoogleAuthButton />
    <div className="auth-divider"><span>or continue with email</span></div>
    <AuthForm action={signUp} mode="signup"/>
    <p className="mt-5 text-xs leading-5 text-zinc-500">By continuing, you agree to our <Link href="/legal/terms" className="text-zinc-300 hover:text-white">Terms</Link> and acknowledge our <Link href="/legal/privacy" className="text-zinc-300 hover:text-white">Privacy Policy</Link>.</p>
    <p className="mt-6 text-center text-sm text-zinc-400">Already have an account? <Link href="/login" className="font-medium text-violet-300 hover:text-violet-200">Sign in</Link></p>
  </section>;
}
