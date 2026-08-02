import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "./logo";
import { logout } from "@/app/(auth)/actions";
import type { Creator } from "@/lib/database.helpers";
import { dashboardLinks } from "@/lib/dashboard-navigation";

export function DashboardShell({ creator, children }: { creator: Creator; children: React.ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_34%_-10%,rgba(76,29,149,.17),transparent_30%),radial-gradient(circle_at_100%_55%,rgba(30,64,175,.08),transparent_28%),#07070b] lg:grid lg:grid-cols-[232px_1fr]">
    <aside className="border-b border-white/[0.07] bg-[#0b0b10]/95 px-4 py-4 lg:fixed lg:inset-y-0 lg:w-[232px] lg:border-b-0 lg:border-r">
      <div className="px-2 py-2"><Logo/></div>
      <nav aria-label="Dashboard" className="mt-5 flex gap-1 overflow-x-auto lg:flex-col">
        {dashboardLinks.map(({href,label,icon:Icon})=><Link key={href} href={href} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800/70 hover:text-white"><Icon size={17}/>{label}</Link>)}
      </nav>
      <div className="mt-auto hidden pt-5 lg:block"><form action={logout}><button className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:text-white">Log out</button></form></div>
    </aside>
    <div className="min-w-0 lg:col-start-2">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#08080d]/85 px-5 backdrop-blur-xl lg:px-8"><div><span className="text-sm font-medium">{creator.display_name}</span><span className="ml-2 text-xs text-zinc-500">@{creator.public_slug}</span></div><Link href={`/c/${creator.public_slug}`} target="_blank" className="button button-secondary min-h-9 py-1.5 text-xs">View public page <ExternalLink size={14}/></Link></header>
      <main className="mx-auto max-w-[1560px] p-4 sm:p-5 lg:p-7 xl:p-8 2xl:p-10">{children}</main>
    </div>
  </div>;
}
