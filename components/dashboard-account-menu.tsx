"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, CircleHelp, CreditCard, LogOut, Settings } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";

type Props = {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  status: string;
};

export function DashboardAccountMenu({ displayName, handle, avatarUrl, status }: Props) {
  const [open, setOpen] = useState(false);
  const [desktopPosition, setDesktopPosition] = useState<{ left: number; top: number } | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const pathname = usePathname() ?? "";
  const settingsActive = pathname.startsWith("/dashboard/settings");
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const positionMenu = () => {
      if (window.innerWidth < 1024) { setDesktopPosition(null); return; }
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const width = 320;
      const height = menuRef.current?.getBoundingClientRect().height ?? 360;
      const left = Math.min(Math.max(12, trigger.left), window.innerWidth - width - 12);
      const top = trigger.top - height - 12 >= 12
        ? trigger.top - height - 12
        : Math.min(window.innerHeight - height - 12, trigger.bottom + 12);
      setDesktopPosition({ left, top: Math.max(12, top) });
    };
    positionMenu();
    requestAnimationFrame(() => { positionMenu(); menuRef.current?.querySelector<HTMLElement>("[data-menu-item]")?.focus(); });
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); window.removeEventListener("resize", positionMenu); window.removeEventListener("scroll", positionMenu, true); };
  }, [open]);

  const avatar = <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,.22)]">{avatarUrl ? <Image src={avatarUrl} alt="" width={40} height={40} unoptimized className="size-full object-cover"/> : initials}</span>;
  const itemClass = "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-white/[.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 motion-reduce:transition-none";

  const overlay = open ? createPortal(<><button type="button" aria-label="Close account menu" className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)}/><div ref={menuRef} id={menuId} role="menu" aria-label="Creator account" style={desktopPosition ? { left: desktopPosition.left, top: desktopPosition.top } : undefined} className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-50 rounded-3xl border border-white/[.1] bg-[#11111a] p-3 shadow-2xl lg:inset-auto lg:w-[320px] lg:rounded-2xl">
      <div className="flex items-center gap-3 border-b border-white/[.07] p-3">{avatar}<div className="min-w-0"><strong className="block truncate text-sm">{displayName}</strong><span className="block truncate text-xs text-zinc-500">@{handle} · {status}</span></div></div>
      <div className="py-2"><Link onClick={() => setOpen(false)} data-menu-item role="menuitem" href="/dashboard/settings" className={itemClass}><Settings aria-hidden size={17}/>Settings</Link><Link onClick={() => setOpen(false)} data-menu-item role="menuitem" href="/dashboard/settings/plans" className={itemClass}><CreditCard aria-hidden size={17}/>Plans</Link><Link onClick={() => setOpen(false)} data-menu-item role="menuitem" href="/contact" className={itemClass}><CircleHelp aria-hidden size={17}/>Help</Link></div>
      <div className="border-t border-white/[.07] px-3 pb-2 pt-3"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">Creator accounts</p><div className="mt-2 flex items-center gap-2 text-sm text-zinc-300"><span className="size-2 rounded-full bg-emerald-400"/><span className="truncate">@{handle}</span><span className="ml-auto text-xs text-zinc-600">Current</span></div></div>
      <form action={logout} className="border-t border-white/[.07] pt-2"><button data-menu-item role="menuitem" className={`${itemClass} text-red-300 hover:bg-red-400/10 hover:text-red-200`}><LogOut aria-hidden size={17}/>Log out</button></form>
    </div></>, document.body) : null;

  return <div ref={rootRef} className="relative mt-4 border-t border-white/[.07] pt-4 lg:mt-auto">
    <button ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={`Creator account for ${displayName}, @${handle}`} onClick={() => setOpen((value) => !value)} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-white/[.025] p-2.5 text-left transition hover:border-violet-300/20 hover:bg-white/[.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 motion-reduce:transition-none ${settingsActive ? "border-violet-300/25 bg-violet-400/[.07]" : "border-white/[.07]"}`}>
      {avatar}<span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-white">{displayName}</strong><span className="block truncate text-xs text-zinc-500">@{handle}</span></span><ChevronDown aria-hidden size={16} className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}/>
    </button>
    {overlay}
  </div>;
}
