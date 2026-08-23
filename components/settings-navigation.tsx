"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ArrowLeft, CircleUserRound, KeyRound, LayoutGrid, LifeBuoy, Link2, WalletCards } from "lucide-react";

const links = [
  { href: "/dashboard/settings", label: "Overview", Icon: LayoutGrid, tone: "violet", exact: true },
  { href: "/dashboard/settings/profile", label: "Profile", Icon: CircleUserRound, tone: "blue" },
  { href: "/dashboard/settings/account", label: "Account & Security", Icon: KeyRound, tone: "indigo" },
  { href: "/dashboard/settings/connected-accounts", label: "Connected Platforms", Icon: Link2, tone: "cyan" },
  { href: "/dashboard/settings/recovery-pass", label: "Recovery Pass", Icon: LifeBuoy, tone: "aqua" },
  { href: "/dashboard/settings/plans", label: "Plans & Billing", Icon: WalletCards, tone: "violet" },
] as const;

const subscribeToPathname = () => () => undefined;

export function isActiveSettingsRoute(pathname: string, href: string, exact = false) {
  if (!pathname) return false;
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsNavigation() {
  const pathname = usePathname();
  const clientPathname = useSyncExternalStore(subscribeToPathname, () => pathname, () => "");
  return <nav aria-label="Settings" className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] xl:sticky xl:top-24 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0 xl:pb-0">
    {links.map((item) => {
      const { href, label, Icon, tone } = item;
      const current = isActiveSettingsRoute(clientPathname, href, "exact" in item && item.exact);
      return <Link key={href} href={href} aria-current={current ? "page" : undefined} data-tone={tone} className="settings-nav-item"><span className="settings-nav-icon"><Icon aria-hidden size={17}/></span><span>{label}</span></Link>;
    })}
  </nav>;
}

export function SettingsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clientPathname = useSyncExternalStore(subscribeToPathname, () => pathname, () => "");
  const overview = clientPathname === "" || clientPathname === "/dashboard/settings";
  return <div className="settings-workspace grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-10"><aside className={`min-w-0 ${overview ? "" : "hidden xl:block"}`}><SettingsNavigation/></aside><div className="settings-content min-w-0">{!overview && <Link href="/dashboard/settings" className="settings-back mb-6 inline-flex min-h-11 items-center gap-2 text-sm xl:hidden"><ArrowLeft aria-hidden size={16}/>All settings</Link>}{children}</div></div>;
}
