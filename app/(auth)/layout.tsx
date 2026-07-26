import { Logo } from "@/components/logo";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell min-h-screen">
    <aside className="auth-story">
      <Logo />
      <div className="relative z-10 max-w-lg">
        <p className="eyebrow">Built beyond the algorithm</p>
        <h2 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-.045em] lg:text-5xl">Your audience deserves a permanent way to find you.</h2>
        <p className="mt-5 max-w-md leading-7 text-zinc-400">One official home for your accounts, recovery links and direct audience connection.</p>
      </div>
      <p className="relative z-10 text-xs text-zinc-600">© {new Date().getFullYear()} AudienceOwn</p>
    </aside>
    <section className="grid min-h-screen place-items-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[430px]">
        <div className="mb-10 lg:hidden"><Logo /></div>
        {children}
      </div>
    </section>
  </main>;
}
