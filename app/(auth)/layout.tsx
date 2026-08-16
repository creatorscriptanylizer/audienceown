import { Logo } from "@/components/logo";
import Link from "next/link";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell min-h-screen">
    <aside className="auth-story">
      <Logo />
      <div className="relative z-10 max-w-lg">
        <p className="eyebrow">Built beyond the algorithm</p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.045em] lg:text-5xl">Never lose your audience, again.</h1>
        <h2 className="mt-6 max-w-md text-xl font-medium leading-8 text-zinc-300 lg:text-2xl">Your audience deserves a permanent way to find you.</h2>
      </div>
      <p className="relative z-10 text-xs text-zinc-600">© {new Date().getFullYear()} AudienceOwn</p>
    </aside>
    <section className="grid min-h-screen place-items-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[430px]">
        <div className="mb-10 lg:hidden"><Logo /></div>
        {children}
        <nav aria-label="Legal and support" className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-zinc-500"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund-policy">Refund Policy</Link><Link href="/cookie-policy">Cookie Policy</Link><Link href="/data-deletion">Data deletion</Link><Link href="/google-api-disclosure">Google API Disclosure</Link><Link href="/contact">Support</Link></nav>
      </div>
    </section>
  </main>;
}
