import { Logo } from "./logo";
import type { Creator } from "@/lib/database.helpers";
import { DashboardNavigation } from "./dashboard-navigation";
import { DashboardAccountMenu } from "./dashboard-account-menu";

function safeAvatarUrl(value: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

export function DashboardShell({ creator, children }: { creator: Creator; children: React.ReactNode }) {
  return <div className="dashboard-app min-h-screen bg-[radial-gradient(circle_at_34%_-10%,rgba(76,29,149,.19),transparent_30%),radial-gradient(circle_at_100%_55%,rgba(30,64,175,.09),transparent_28%),linear-gradient(180deg,#07070c,#08090f_45%,#07070b)] lg:grid lg:grid-cols-[232px_1fr]">
    <aside className="flex flex-col border-b border-white/[0.07] bg-[linear-gradient(180deg,rgba(14,13,22,.98),rgba(8,9,14,.98))] px-4 py-4 shadow-[20px_0_70px_rgba(0,0,0,.16)] lg:fixed lg:inset-y-0 lg:w-[232px] lg:border-b-0 lg:border-r">
      <div className="px-2 py-2"><Logo/></div>
      <DashboardNavigation/>
      <DashboardAccountMenu displayName={creator.display_name} handle={creator.public_slug ?? "creator"} avatarUrl={safeAvatarUrl(creator.profile_image_path)} status={creator.recovery_pass_enabled ? "Recovery Pass active" : "Setup in progress"}/>
    </aside>
    <div className="min-w-0 lg:col-start-2">
      <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-white/[0.07] bg-[#08080d]/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-8"><div className="type-body min-w-0"><span className="block truncate font-medium sm:inline">{creator.display_name}</span><span className="block truncate text-zinc-300 sm:ml-2 sm:inline">@{creator.public_slug}</span></div></header>
      <main className="mx-auto max-w-[1560px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 lg:p-7 xl:p-8 2xl:p-10">{children}</main>
    </div>
  </div>;
}
