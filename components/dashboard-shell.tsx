import { Logo } from "./logo";
import { logout } from "@/app/(auth)/actions";
import type { Creator } from "@/lib/database.helpers";
import { DashboardNavigation } from "./dashboard-navigation";

export function DashboardShell({ creator, children }: { creator: Creator; children: React.ReactNode }) {
  return <div className="dashboard-app min-h-screen bg-[radial-gradient(circle_at_34%_-10%,rgba(76,29,149,.17),transparent_30%),radial-gradient(circle_at_100%_55%,rgba(30,64,175,.08),transparent_28%),#07070b] lg:grid lg:grid-cols-[232px_1fr]">
    <aside className="border-b border-white/[0.07] bg-[#0b0b10]/95 px-4 py-4 lg:fixed lg:inset-y-0 lg:w-[232px] lg:border-b-0 lg:border-r">
      <div className="px-2 py-2"><Logo/></div>
      <DashboardNavigation/>
      <div className="mt-auto hidden pt-5 lg:block"><form action={logout}><button className="type-body w-full rounded-lg px-3 py-2 text-left font-medium text-zinc-300 hover:text-white">Log out</button></form></div>
    </aside>
    <div className="min-w-0 lg:col-start-2">
      <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-white/[0.07] bg-[#08080d]/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-8"><div className="type-body min-w-0"><span className="block truncate font-medium sm:inline">{creator.display_name}</span><span className="block truncate text-zinc-300 sm:ml-2 sm:inline">@{creator.public_slug}</span></div></header>
      <main className="mx-auto max-w-[1560px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 lg:p-7 xl:p-8 2xl:p-10">{children}</main>
    </div>
  </div>;
}
