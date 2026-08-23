"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { dashboardLinks } from "@/lib/dashboard-navigation";

export function normalizeDashboardPathname(pathname: string) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function isActiveDashboardRoute(pathname: string, href: string) {
  const current = normalizeDashboardPathname(pathname);
  const target = normalizeDashboardPathname(href);
  if (target === "/dashboard") return current === target;
  return current === target || current.startsWith(`${target}/`);
}

const subscribeToPathname = () => () => undefined;
const navigationIconSize = 19;
const navigationLinkClass = "type-body group flex min-h-12 shrink-0 snap-start items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 font-medium transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 motion-reduce:transition-none lg:gap-3 [&>svg]:transition [&>svg]:duration-200 motion-reduce:[&>svg]:transition-none";
const activeNavigationClass = "border-violet-300/15 bg-violet-400/[.11] text-violet-100 shadow-[0_10px_30px_rgba(76,29,149,.12),inset_0_1px_rgba(255,255,255,.025)] [&>svg]:text-violet-300 [&>svg]:drop-shadow-[0_0_8px_rgba(167,139,250,.35)]";
const inactiveNavigationClass = "text-zinc-300 hover:border-white/[.06] hover:bg-white/[.04] hover:text-white hover:[&>svg]:translate-x-px hover:[&>svg]:text-violet-200";

export function DashboardNavigation(){
  const pathname=usePathname();
  const clientPathname=useSyncExternalStore(subscribeToPathname,()=>pathname,()=>"");
  return <nav aria-label="Dashboard" className="dashboard-mobile-nav mt-5 flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain pb-1 lg:flex-col lg:overflow-visible">
    {dashboardLinks.map(({href,label,icon:Icon})=>{const current=clientPathname!==""&&isActiveDashboardRoute(clientPathname,href);return <Link key={href} href={href} aria-current={current?"page":undefined} className={`${navigationLinkClass} ${current?activeNavigationClass:inactiveNavigationClass}`}><Icon aria-hidden="true" size={navigationIconSize} strokeWidth={2}/><span>{label}</span></Link>})}
  </nav>;
}
