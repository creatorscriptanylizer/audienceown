import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";
import { GoogleAuthButton } from "@/components/google-auth-button";
export default function LoginPage() { return <section className="auth-card">
  <p className="eyebrow mb-3">Welcome back</p>
  <h1 className="text-3xl font-semibold tracking-[-.035em]">Sign in to AudienceOwn</h1>
  <p className="mb-7 mt-2 text-sm leading-6 text-zinc-400">Manage your page and stay connected to your audience.</p>
  <GoogleAuthButton next="/dashboard"/>
  <div className="auth-divider"><span>or continue with email</span></div>
  <AuthForm action={login} mode="login"/>
  <p className="mt-7 text-center text-sm text-zinc-400">New to AudienceOwn? <Link href="/register" className="font-medium text-violet-300 hover:text-violet-200">Create your page</Link></p>
</section>; }
