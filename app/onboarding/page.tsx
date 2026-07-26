import { redirect } from "next/navigation";
import { CreatorForm } from "@/components/creator-form";
import { Logo } from "@/components/logo";
import { getCreator, requireViewer } from "@/lib/dal";
export default async function Onboarding(){await requireViewer(); if(await getCreator()) redirect("/dashboard"); return <main className="mx-auto min-h-screen max-w-2xl px-5 py-10"><Logo/><div className="mt-16"><p className="eyebrow">Step 1 of 1</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Claim your permanent creator identity</h1><p className="mb-9 mt-3 text-zinc-400">This is the page you’ll share across every platform. Your AudienceOwn URL stays with you even if your social accounts change.</p><section className="surface rounded-2xl p-6 sm:p-8"><CreatorForm publicSiteUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/></section></div></main>}
