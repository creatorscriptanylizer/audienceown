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
const navigationLinkClass = "type-body flex min-h-12 shrink-0 snap-start items-center gap-2.5 rounded-lg px-3 py-2.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 motion-reduce:transition-none lg:gap-3";
const activeNavigationClass = "bg-violet-400/12 text-violet-100 ring-1 ring-inset ring-violet-300/15";
const inactiveNavigationClass = "text-zinc-300 hover:bg-zinc-800/70 hover:text-white";

export function DashboardNavigation(){
  const pathname=usePathname();
  const clientPathname=useSyncExternalStore(subscribeToPathname,()=>pathname,()=>"");
  return <nav aria-label="Dashboard" className="dashboard-mobile-nav mt-5 flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain pb-1 lg:flex-col lg:overflow-visible">
    {dashboardLinks.map(({href,label,icon:Icon})=>{const current=clientPathname!==""&&isActiveDashboardRoute(clientPathname,href);return <Link key={href} href={href} aria-current={current?"page":undefined} className={`${navigationLinkClass} ${current?activeNavigationClass:inactiveNavigationClass}`}><Icon aria-hidden="true" size={navigationIconSize} strokeWidth={2}/><span>{label}</span></Link>})}
  </nav>;
}
