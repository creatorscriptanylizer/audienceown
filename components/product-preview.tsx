"use client";

import { useState } from "react";
import { ArrowUpRight, Camera, Check, CirclePlay } from "lucide-react";

export function ProductPreview() {
  const [subscribed, setSubscribed] = useState(false);
  return <div className="preview-wrap" aria-label="Interactive AudienceOwn product preview">
    <div className="signal-line signal-line-one" />
    <div className="signal-line signal-line-two" />
    <div className="preview-label"><span className="size-1.5 rounded-full bg-emerald-400"/>Live product preview</div>
    <article className="creator-preview">
      <header className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
        <span className="text-xs font-medium text-zinc-500">audienceown.com/yourname</span>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400">Preview</span>
      </header>
      <div className="p-5 sm:p-7">
        <div className="preview-avatar">YO</div>
        <div className="mt-4 flex items-center gap-2"><h2 className="text-xl font-semibold tracking-tight">Your creator page</h2><span className="grid size-4 place-items-center rounded-full bg-violet-500"><Check size={10}/></span></div>
        <p className="mt-1 text-sm text-zinc-500">@yourname</p>
        <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-300">Your permanent home across every platform.</p>
        <div className="mt-6 space-y-2.5">
          <button className="preview-link"><span><CirclePlay size={17}/>Main channel</span><ArrowUpRight size={15}/></button>
          <button className="preview-link"><span><Camera size={17}/>Official account</span><ArrowUpRight size={15}/></button>
          <button className="preview-link"><span><span className="grid size-[17px] place-items-center rounded-full border text-[9px] font-bold">R</span>Recovery account</span><ArrowUpRight size={15}/></button>
        </div>
        <div className="mt-5 rounded-[14px] border border-white/[.08] bg-black/40 p-4">
          <p className="text-sm font-medium">Stay connected directly</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Get important creator updates by email.</p>
          {subscribed ? <p role="status" className="mt-3 flex h-10 items-center gap-2 text-sm text-emerald-300"><Check size={16}/>Preview subscribed</p> :
            <form className="mt-3 flex gap-2" onSubmit={e => {e.preventDefault(); setSubscribed(true)}}>
              <input aria-label="Preview email address" type="email" required placeholder="you@example.com" className="min-w-0 flex-1 rounded-[10px] border border-white/10 bg-[#0a0a0a] px-3 text-xs outline-none focus:border-violet-500"/>
              <button className="rounded-[10px] bg-white px-3 text-xs font-semibold text-black transition hover:bg-zinc-200">Join</button>
            </form>}
        </div>
      </div>
    </article>
  </div>;
}
