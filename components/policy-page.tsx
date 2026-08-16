import Link from "next/link";
import { Logo } from "@/components/logo";
import { PublicFooter } from "@/components/public-footer";

export function PolicyPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <main className="min-h-screen"><article className="mx-auto max-w-3xl px-5 py-10"><Logo/><div className="mt-14"><p className="eyebrow">{eyebrow}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1><p className="mt-5 text-lg leading-8 text-zinc-300">{intro}</p><p className="mt-4 text-xs text-zinc-500">Last updated: 5 August 2026</p></div>
    <div className="policy-content mt-12 space-y-10">{children}</div>
    <div className="mt-12 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100">This policy should be reviewed by qualified legal counsel before public launch.</div>
    <p className="mt-8 text-sm text-zinc-500"><Link href="/">Return to AudienceOwn</Link></p></article><PublicFooter/></main>;
}

export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-xl font-semibold">{title}</h2><div className="mt-3 space-y-3 leading-7 text-zinc-400">{children}</div></section>;
}
