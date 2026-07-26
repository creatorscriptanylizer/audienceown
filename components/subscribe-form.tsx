"use client";
import { useState } from "react";
import { ArrowLeft, Check, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { normaliseSource } from "@/lib/recovery-pass";

type Tokens = { preferenceToken: string; unsubscribeToken: string };

export function SubscribeForm({handle,creatorName,source}:{handle:string;creatorName:string;source?:string}) {
  const [step,setStep]=useState(0);
  const [state,setState]=useState<"idle"|"loading"|"error">("idle");
  const [tokens,setTokens]=useState<Tokens|null>(null);
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setState("loading");
    const form=new FormData(e.currentTarget);
    try {
      const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
      if(!base) throw new Error();
      const response=await fetch(`${base}/functions/v1/subscribe`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        slug:handle,email:form.get("email"),source_platform:normaliseSource(source),
        landing_path:window.location.pathname,source_referrer:document.referrer||null,
        preferences:{creator_announcements:form.get("announcements")==="on",new_content:form.get("videos")==="on",important_account_updates:form.get("recovery")==="on"}
      })});
      if(!response.ok) throw new Error();
      setTokens(await response.json()); setStep(3); setState("idle");
    } catch { setState("error"); }
  }
  if(step===3&&tokens) return <div role="status" className="pass-success">
    <span className="pass-success-icon"><ShieldCheck size={28}/></span>
    <h3>Recovery Pass activated</h3>
    <p>Your connection to {creatorName} is protected. If their account disappears or moves, AudienceOwn can help you find the correct account again.</p>
    <div className="pass-summary"><span><Mail size={15}/> Email enabled</span><span><Check size={15}/> Your chosen alerts saved</span></div>
    <div className="flex flex-wrap gap-3"><Link className="button button-primary" href={`/preferences/${tokens.preferenceToken}`}>Manage Recovery Pass</Link><button className="button button-secondary" onClick={()=>setStep(0)}>Done</button></div>
  </div>;
  if(step===0) return <div>
    <button className="button button-primary w-full text-base" onClick={()=>setStep(1)}>Protect my connection</button>
    <p className="mt-3 text-center text-xs text-zinc-400">No password. No newsletter. You control every alert.</p>
  </div>;
  return <form onSubmit={submit} className="pass-flow">
    <div className="pass-step"><button type="button" aria-label="Go back" onClick={()=>setStep(Math.max(0,step-1))}><ArrowLeft size={18}/></button><span>Step {step} of 2</span></div>
    {step===1?<div><p className="eyebrow">Recovery methods</p><h3>Choose how to protect your connection</h3><button type="button" className="method-choice is-selected" onClick={()=>setStep(2)}><span><Mail size={20}/><b>Email</b></span><Check size={18}/></button><p className="method-note">Email is the recovery method currently available for this creator. It is used only for the alerts you choose.</p><button type="button" className="button button-primary w-full" onClick={()=>setStep(2)}>Continue</button></div>:
    <div><p className="eyebrow">Your pass</p><h3>Where should we reach you?</h3><label className="label" htmlFor="pass-email">Email address</label><div className="relative"><Mail className="absolute left-3 top-3.5 text-zinc-500" size={17}/><input className="input pl-10" id="pass-email" name="email" type="email" inputMode="email" autoComplete="email" required/></div><fieldset className="mt-6"><legend className="label">Choose your alerts</legend><div className="pass-options"><label><input type="checkbox" name="recovery" defaultChecked/><span><b>Recovery alerts</b><small>Account unavailable, hacked, suspended, deleted, or moved.</small></span></label><label><input type="checkbox" name="videos"/><span><b>New video alerts</b><small>Creator-published video updates.</small></span></label><label><input type="checkbox" name="announcements"/><span><b>Creator announcements</b><small>Important messages from {creatorName}.</small></span></label></div></fieldset>{state==="error"&&<p role="alert" className="mt-3 text-sm text-red-300">We couldn’t activate your pass. Please try again.</p>}<button disabled={state==="loading"} className="button button-primary mt-5 w-full">{state==="loading"&&<LoaderCircle className="animate-spin" size={16}/>}Activate Recovery Pass</button><p className="mt-3 text-xs text-zinc-500">By activating, you consent to the selected alerts by email. Manage or deactivate your pass at any time.</p></div>}
  </form>;
}
