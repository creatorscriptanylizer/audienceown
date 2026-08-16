"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, ChevronRight, CircleAlert, Copy, Link2, LoaderCircle, Megaphone, RefreshCw, Share2, Shield, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { createRecoveryPass, type RecoveryPassState } from "@/app/onboarding/actions";
import { SubmitButton } from "@/components/submit-button";
import { applyRecoveryPassSlugEdit, canSubmitCreatorForm, localSlugAvailability, type SlugAvailability } from "@/lib/creator-profile";
import { canonicalRecoveryPassUrl, displayRecoveryPassUrl } from "@/lib/recovery-pass";
import { copyRecoveryPassLink, shareRecoveryPassLink } from "@/lib/recovery-pass-client";

type Props = { initialName:string; initialSlug:string; publicSiteUrl:string; avatarUrl?:string|null; officialConnected?:boolean; backupConnected?:boolean };

export function RecoveryPassSetup({ initialName, initialSlug, publicSiteUrl, avatarUrl, officialConnected=false, backupConnected=false }:Props) {
  const [state, action] = useActionState<RecoveryPassState,FormData>(createRecoveryPass, {});
  const [slugState, setSlugState] = useState({ slug:initialSlug, manuallyEdited:false });
  const [remote, setRemote] = useState<{slug:string;availability:SlugAvailability}|null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const requestSequence = useRef(0);
  const local = localSlugAvailability(slugState.slug, initialSlug);
  const availability = local.status === "checking" && remote?.slug === slugState.slug ? remote.availability : local;
  const origin = publicSiteUrl.replace(/\/$/, "");
  const previewSlug = slugState.slug || "your-name";
  const cleanPath = `/${previewSlug}`;
  const canonicalUrl = canonicalRecoveryPassUrl(origin, previewSlug);
  const displayUrl = displayRecoveryPassUrl(origin, previewSlug);

  useEffect(() => {
    const current = localSlugAvailability(slugState.slug, initialSlug);
    if (current.status !== "checking") return;
    let active = true;
    const checked = slugState.slug;
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/onboarding/recovery-pass/availability", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slug:checked}),signal:controller.signal});
        const result = await response.json() as {status?:"available"|"taken"|"reserved"|"invalid"|"error";normalizedName?:string;code?:string;message?:string};
        if (!active || sequence !== requestSequence.current || checked !== slugState.slug) return;
        const next:SlugAvailability = result.status === "available" ? {status:"available"}
          : result.status === "taken" ? {status:"taken"}
          : result.status === "reserved" ? {status:"reserved",message:result.message??"This creator name isn't available."}
          : result.status === "error" ? {status:"error",message:"We couldn't check this name right now."}
          : result.status === "invalid" ? {status:"invalid",message:result.message??"Invalid creator name."}
          : {status:"error",message:result.message??"We couldn't check this name right now."};
        setRemote({slug:checked,availability:next});
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (active && sequence === requestSequence.current && checked === slugState.slug)
          setRemote({slug:checked,availability:{status:"error",message:"We couldn't check this name right now."}});
      }
    }, 350);
    return () => { active=false; controller.abort(); window.clearTimeout(timer); };
  }, [slugState.slug, initialSlug, retryKey]);

  const currentCanonicalUrl = state.url ? canonicalRecoveryPassUrl(origin, state.url.replace(/^\//,"")) : canonicalUrl;
  async function copy() {
    if (!slugState.slug && !state.url) return;
    await copyRecoveryPassLink(currentCanonicalUrl);
    setCopied(true); window.setTimeout(()=>setCopied(false),1800);
  }
  async function share() {
    if (!slugState.slug && !state.url) return;
    const result=await shareRecoveryPassLink(currentCanonicalUrl);
    if(result==="copied"){setCopied(true);window.setTimeout(()=>setCopied(false),1800)}
  }

  if (state.success) return <section className="recovery-success" aria-live="polite">
    <span><ShieldCheck size={28}/></span><p className="eyebrow">Recovery Pass ready</p><h1>Your Recovery Pass is ready.</h1>
    <Link href={state.url??cleanPath} className="recovery-success-url">{displayRecoveryPassUrl(origin,(state.url??cleanPath).replace(/^\//,""))}</Link>
    <p>Followers can use this link to find your trusted accounts whenever you need to move or recover.</p>
    <div><button type="button" className="button button-secondary" onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?"Copied":"Copy link"}</button><button type="button" className="button button-secondary" onClick={share}><Share2 size={16}/> Share Recovery Pass</button><Link className="button button-primary" href="/onboarding">Continue</Link></div>
  </section>;

  const feedback = availability.status === "checking" ? "Checking availability..."
    : availability.status === "available" || availability.status === "unchanged" ? `✓ ${slugState.slug} is available`
    : availability.status === "taken" ? "Creator name is already taken."
    : availability.status === "error" || availability.status === "reserved" ? availability.message
    : availability.status === "invalid" ? availability.message : "Choose your creator name to continue.";
  const FeedbackIcon = availability.status === "checking" ? LoaderCircle : availability.status === "available" || availability.status === "unchanged" ? CheckCircle2 : availability.status === "idle" ? null : CircleAlert;
  const feedbackAlert = ["taken","reserved","invalid","error"].includes(availability.status);
  const connectedText = (connected:boolean) => connected ? "Connected" : "Not connected yet";

  return <div className="recovery-pass-stage"><div className="recovery-pass-grid">
    <section className="recovery-pass-create"><p className="eyebrow">Permanent creator identity</p><h1>Create your<br/><span>Recovery Pass</span></h1><p className="onboarding-lead">Give your followers one permanent place to find you,<br className="desktop-only"/> even if a platform account disappears.</p>
      <form action={action} className="recovery-pass-form">
        <label htmlFor="public_slug">Choose your creator name</label>
        <div className={`creator-name-field is-${availability.status}`}><span aria-hidden>@</span><input id="public_slug" name="public_slug" value={slugState.slug} placeholder="yourname" maxLength={40} required autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={availability.status==="taken"||availability.status==="reserved"||availability.status==="invalid"} aria-describedby="slug-feedback" onChange={event=>setSlugState(applyRecoveryPassSlugEdit(event.target.value))}/>{(availability.status==="available"||availability.status==="unchanged")&&<CheckCircle2 className="creator-name-check" aria-label="Available"/>}</div>
        <input type="hidden" name="display_name" value={initialName}/>
        <div id="slug-feedback" className={`slug-feedback is-${availability.status}`} role={feedbackAlert?"alert":"status"} aria-live="polite">{FeedbackIcon&&<FeedbackIcon className={availability.status==="checking"?"animate-spin":""} size={17}/>}<span>{feedback}</span>{availability.status==="error"&&<button type="button" onClick={()=>{setRemote(null);setRetryKey(key=>key+1)}}><RefreshCw size={15}/> Retry</button>}</div>
        <label htmlFor="recovery_url">Your Recovery Pass</label>
        <div className={`recovery-url-field${slugState.slug?"":" is-placeholder"}`}><Link2 size={19}/><input id="recovery_url" readOnly value={displayUrl} tabIndex={-1}/><button type="button" onClick={copy} disabled={!slugState.slug} aria-label="Copy Recovery Pass URL">{copied?<Check size={19}/>:<Copy size={19}/>}</button></div>
        <p className="recovery-ownership"><ShieldCheck size={17}/> Permanent. Always yours.</p>
        {state.error&&<p className="onboarding-error" role="alert">{state.error}</p>}
        <SubmitButton className="button button-primary onboarding-primary" pendingText="Creating your Recovery Pass..." disabled={!canSubmitCreatorForm(availability)}>Create my Recovery Pass <ArrowRight size={20}/></SubmitButton>
        <p className="recovery-secure"><ShieldCheck size={17}/> 100% yours. Secure. Permanent.</p>
      </form>
    </section>
    <div className="recovery-preview-column"><aside className="recovery-pass-preview" aria-label="Live Recovery Pass identity preview">
      <div className="recovery-preview-top"><span>AudienceOwn</span><ShieldCheck size={22}/></div>
      <div className="recovery-preview-identity">{avatarUrl?<Image className="recovery-preview-avatar" src={avatarUrl} width={76} height={76} unoptimized alt=""/>:<div className="recovery-preview-avatar" aria-hidden>{initialName.trim().slice(0,1).toUpperCase()||"A"}</div>}<h2>{initialName||"Your name"}</h2><p className={`recovery-preview-url${slugState.slug?"":" is-placeholder"}`}>{displayUrl}</p><strong>{slugState.slug?"Your trusted place to reconnect.":"Choose a name to preview your Recovery Pass."}</strong></div>
      <dl className="recovery-preview-status"><div className="is-official"><span><Shield size={19}/></span><div><dt>Official accounts</dt><dd>{connectedText(officialConnected)}</dd></div><ChevronRight/></div><div className="is-backup"><span><UsersRound size={19}/></span><div><dt>Backup accounts</dt><dd>{connectedText(backupConnected)}</dd></div><ChevronRight/></div><div className="is-updates"><span><Megaphone size={19}/></span><div><dt>Updates</dt><dd>Ready when you are</dd></div><ChevronRight/></div></dl>
      <div className={`recovery-preview-share${slugState.slug?"":" is-placeholder"}`}><div><Link2 size={19}/><p><strong>{displayUrl}</strong><span>{slugState.slug?"Share your Recovery Pass":"Your Recovery Pass will appear here"}</span></p></div><div><button type="button" onClick={copy} disabled={!slugState.slug} aria-label="Copy preview URL"><Copy size={18}/></button><button type="button" onClick={share} disabled={!slugState.slug} aria-label="Share Recovery Pass"><Share2 size={18}/></button></div></div>
    </aside><div className="recovery-trust"><span><ShieldCheck/>Permanent<br/>Creator Identity</span><i/><span><UsersRound/>Audience<br/>Recovery</span><i/><span><Sparkles/>Always<br/>Reconnect</span></div></div>
  </div></div>;
}
