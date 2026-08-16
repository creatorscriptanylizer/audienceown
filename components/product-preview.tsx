"use client";

import { useState } from "react";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { PlatformBrandIcon } from "@/components/dashboard/platform-brand-icon";

const accountGroups = [
  ["Official Accounts", [["youtube","YouTube"],["instagram","Instagram"],["tiktok","TikTok"],["x","X"]]],
  ["Backup Accounts", [["youtube","YouTube Backup"],["twitch","Twitch Backup"]]],
] as const;

export function ProductPreview() {
  const [subscribed, setSubscribed] = useState(false);
  return <div className="preview-wrap preview-v2" aria-label="Interactive AudienceOwn Creator Page preview">
    <div className="preview-orbit preview-orbit-one"/><div className="preview-orbit preview-orbit-two"/><span className="orbit-provider orbit-youtube"><PlatformBrandIcon provider="youtube" label="YouTube" size="sm" animated/></span><span className="orbit-provider orbit-instagram"><PlatformBrandIcon provider="instagram" label="Instagram" size="sm" animated/></span>
    <div className="preview-label"><span/>All systems healthy</div>
    <article className="creator-preview">
      <header><span>audienceown.com/maya</span><span>Creator Page</span></header>
      <div className="preview-body"><div className="preview-identity"><div className="preview-avatar">MC<i><Check aria-hidden/></i></div><div><div><h2>Maya Creates</h2><ShieldCheck aria-label="Verified Creator Page"/></div><p>@mayacreates</p></div></div><p className="preview-bio">Videos about design, creative work, and building a life online.</p>
        {accountGroups.map(([heading,accounts])=><section className="preview-group" key={heading}><h3>{heading}</h3>{accounts.map(([provider,name])=><button type="button" className="preview-account" key={name}><PlatformBrandIcon provider={provider} label={name} size="sm" animated/><strong>{name}</strong>{heading.startsWith("Backup")&&<small>Backup</small>}<ArrowUpRight aria-hidden/></button>)}</section>)}
        <section className="preview-direct"><h3>Direct connections</h3><div><span><PlatformBrandIcon provider="newsletter" label="Newsletter" size="sm"/>Newsletter</span><span><PlatformBrandIcon provider="website" label="Website" size="sm"/>Website <ArrowUpRight aria-hidden/></span></div></section>
        <form className="preview-subscribe" onSubmit={event=>{event.preventDefault();setSubscribed(true)}}><label htmlFor="preview-email">Join Maya&apos;s Recovery Pass</label><p>Get important recovery alerts and updates you choose.</p>{subscribed?<strong role="status"><Check aria-hidden/>You are protected in this preview</strong>:<div><input id="preview-email" type="email" required placeholder="you@example.com"/><button>Join</button></div>}</form>
      </div>
    </article>
  </div>;
}
