"use client";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DashboardRefresh() { const router = useRouter(); const [pending, startTransition] = useTransition(); return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-violet-400/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-violet-400 disabled:opacity-60"><RefreshCw aria-hidden size={15} className={pending ? "animate-spin motion-reduce:animate-none" : ""}/>{pending ? "Refreshing…" : "Refresh"}</button>; }
