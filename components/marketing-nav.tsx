"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

const links = [
  ["Product", "#product"],
  ["How it works", "#how-it-works"],
  ["Pricing", "#pricing"],
  ["FAQ", "#faq"],
] as const;

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 10);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return <header className={`marketing-nav ${scrolled || open ? "marketing-nav-solid" : ""}`}>
    <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
      <Logo />
      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
        {links.map(([label, href]) => <Link key={href} href={href} className="nav-link">{label}</Link>)}
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/login" className="nav-signin hidden sm:inline-flex">Sign in</Link>
        <Link href="/register" className="button button-primary h-10 px-4 text-sm">Create your page</Link>
        <button type="button" className="nav-menu md:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(v => !v)}>
          {open ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>
    </div>
    {open && <nav className="mobile-nav md:hidden" aria-label="Mobile navigation">
      {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
    </nav>}
  </header>;
}
