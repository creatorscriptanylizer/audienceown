import { Logo } from "@/components/logo";
import { AuthProtectionVisual } from "@/components/auth-protection-visual";
import { Check } from "lucide-react";
import Link from "next/link";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell min-h-screen">
    <aside className="auth-story">
      <div className="auth-story-logo"><Logo /></div>
      <div className="auth-story-default relative z-10 max-w-lg">
        <p className="eyebrow">Built beyond the algorithm</p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.045em] lg:text-5xl">Never lose your audience, again.</h1>
        <h2 className="mt-6 max-w-md text-xl font-medium leading-8 text-zinc-300 lg:text-2xl">Your audience deserves a permanent way to find you.</h2>
      </div>
      <div className="auth-register-story">
        <div className="auth-register-copy">
          <p className="auth-register-eyebrow">Audience protection for creators</p>
          <h1><span>Build Your Audience.</span><strong>Protect What You Build.</strong></h1>
          <p className="auth-register-support">You&apos;ve been told to own your audience. AudienceOwn gives you the protection layer around it — a permanent identity, backup destinations, platform monitoring, recovery, and direct ways to stay connected.</p>
          <ul className="auth-trust-row" aria-label="Signup benefits">
            {["Free to start", "No credit card required", "Your permanent link stays yours"].map(item => <li key={item}><Check aria-hidden />{item}</li>)}
          </ul>
        </div>
        <AuthProtectionVisual />
      </div>
      <p className="relative z-10 text-xs text-zinc-600">© {new Date().getFullYear()} AudienceOwn</p>
    </aside>
    <section className="auth-form-environment grid min-h-screen place-items-center px-5 py-10 sm:px-10">
      <div className="auth-form-wrap w-full max-w-[430px]">
        <div className="mb-10 lg:hidden"><Logo /></div>
        {children}
        <nav aria-label="Legal and support" className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-zinc-500"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund-policy">Refund Policy</Link><Link href="/cookie-policy">Cookie Policy</Link><Link href="/data-deletion">Data deletion</Link><Link href="/google-api-disclosure">Google API Disclosure</Link><Link href="/contact">Support</Link></nav>
      </div>
    </section>
  </main>;
}
