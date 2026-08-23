"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Copy, ExternalLink, Link2, Share2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyRecoveryPassLink, shareRecoveryPassLink } from "@/lib/recovery-pass-client";
import "./recovery-pass-card.css";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400";

function useCopiedState() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function announce() {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }
  return { copied, announce };
}

export function RecoveryPassShareButton({ url, className = "" }: { url: string; className?: string }) {
  const { copied, announce } = useCopiedState();
  async function share() { if (await shareRecoveryPassLink(url) === "copied") announce(); }
  return <button type="button" aria-label="Share Recovery Pass" onClick={share} className={`${focus} ${className}`}><Share2 aria-hidden size={15} /><span aria-live="polite">{copied ? "Copied ✓" : "Share Recovery Pass"}</span></button>;
}

type Pass = { exists: boolean; active: boolean; canonicalUrl: string | null; displayUrl: string | null; href: string; name?: string };

export function RecoveryPassCard({ recoveryPass, showViewAction = true }: { recoveryPass: Pass; showViewAction?: boolean }) {
  const { copied, announce } = useCopiedState();
  if (!recoveryPass.exists || !recoveryPass.canonicalUrl || !recoveryPass.displayUrl) return <section className="dashboard-recovery-pass-create" aria-labelledby="recovery-pass-title"><p>Recovery Pass</p><h2 id="recovery-pass-title">Create your Recovery Pass</h2><span>Give your audience one permanent place to find you.</span><Link href="/onboarding/recovery-pass" className={`${focus} recovery-pass-action recovery-pass-action-primary`}>Create Recovery Pass <ArrowRight aria-hidden size={15} /></Link></section>;

  async function copy() { await copyRecoveryPassLink(recoveryPass.canonicalUrl!); announce(); }
  async function share() { if (await shareRecoveryPassLink(recoveryPass.canonicalUrl!) === "copied") announce(); }

  return <section className="recovery-pass-feature" aria-labelledby="recovery-pass-title">
    <div className="recovery-pass-feature-head"><p className="text-sm font-semibold uppercase tracking-[.16em] text-violet-300">Your Recovery Pass</p><span className={`recovery-pass-status ${recoveryPass.active ? "ready text-emerald-300" : "action text-amber-200"}`}>{recoveryPass.active ? <Check aria-hidden size={13} /> : <AlertTriangle aria-hidden size={13} />} {recoveryPass.active ? "Ready" : "Action required"}</span></div>
    <h2 id="recovery-pass-title">{recoveryPass.name ?? "Your Recovery Pass"}</h2>
    <p className="mt-1 text-base leading-[1.6] text-zinc-300">Share this link with your followers so they always know where to find you.</p>
    <div className="recovery-pass-url"><Link2 aria-hidden size={17} /><span className="overflow-hidden text-ellipsis whitespace-nowrap text-base">{recoveryPass.displayUrl}</span></div>
    <div className="recovery-pass-actions"><button type="button" aria-label="Copy Recovery Pass link" onClick={copy} className={`${focus} recovery-pass-action recovery-pass-action-secondary`}>{copied ? <Check aria-hidden size={15} /> : <Copy aria-hidden size={15} />}<span aria-live="polite">{copied ? "Copied ✓" : "Copy link"}</span></button><button type="button" aria-label="Share Recovery Pass" onClick={share} className={`${focus} recovery-pass-action recovery-pass-action-primary`}><Share2 aria-hidden size={15} />Share</button>{showViewAction && <Link aria-label="View Recovery Pass" href={recoveryPass.href} className={`${focus} recovery-pass-action recovery-pass-action-tertiary`}>View Recovery Pass <ExternalLink aria-hidden size={14} /></Link>}</div>
    <ShieldCheck aria-hidden className="recovery-pass-watermark" size={86} />
  </section>;
}
