"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, KeyRound, LayoutGrid, LifeBuoy, Link2, ShieldCheck } from "lucide-react";

const links = [
  { href: "/dashboard/settings", label: "Overview", Icon: LayoutGrid, exact: true },
  { href: "/dashboard/creator-page", label: "Profile", Icon: CircleUserRound },
  { href: "/dashboard/settings/account", label: "Account", Icon: KeyRound },
  { href: "/dashboard/security", label: "Security", Icon: ShieldCheck },
  { href: "/dashboard/settings/connected-accounts", label: "Connected Platforms", Icon: Link2 },
  { href: "/dashboard/audience", label: "Recovery Pass", Icon: LifeBuoy },
] as const;

export function SettingsNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Settings" className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] xl:sticky xl:top-24 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0 xl:pb-0">
    {links.map((item) => {
      const { href, label, Icon } = item;
      const current = "exact" in item && item.exact ? pathname === href : pathname.startsWith(href);
      return <Link key={href} href={href} aria-current={current ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 motion-reduce:transition-none ${current ? "bg-violet-400/10 font-medium text-violet-200" : "text-zinc-400 hover:bg-white/[.04] hover:text-white"}`}><Icon aria-hidden size={17}/>{label}</Link>;
    })}
  </nav>;
}

export function SettingsFrame({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-10"><aside className="min-w-0"><SettingsNavigation/></aside><div className="min-w-0">{children}</div></div>;
}
