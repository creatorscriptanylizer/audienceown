"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudienceOwnLogo } from "@/components/logo";
import {
  Activity, ArrowLeft, ArrowRight, BellRing, CalendarDays, Check, CheckCircle2, ChevronRight,
  ExternalLink, Globe2, Mail, Megaphone, MessageCircle, Radio, RadioTower,
  RotateCcw, Settings2, ShieldCheck, ShoppingBag, Smartphone, Trash2, Users,
  Video, X,
} from "lucide-react";
import { getPlatform } from "@/lib/platforms";
import {
  CreatorRecord, readSavedRecoveryPass,
  removeSavedRecoveryPass, type SavedRecoveryPass, saveRecoveryPass, updateSavedRecoveryPass,
} from "@/lib/public-creators";
import {
  DEFAULT_RECOVERY_PREFERENCES,
  isValidRecoveryContact,
  type RecoveryCategory,
  type RecoveryPreferences,
} from "@/lib/recovery-preferences";
import {
  browserPushSupport,
  enableBrowserPush,
  type BrowserPushErrorCode,
  unsubscribeBrowserPush,
} from "@/lib/browser-push-client";
import { normaliseSource } from "@/lib/recovery-pass";
import type { PublicIdentityGraph } from "@/lib/identity/types";
import type { AuthenticityRecord } from "@/lib/authenticity/types";
import { VerifiedCreatorCard } from "@/components/authenticity/verified-creator-card";
import { RecoveryPassDestinations } from "@/components/recovery-pass-destinations";

type AlertMethod = "Email" | "SMS" | "WhatsApp" | "Browser notification";
const methods: { name: AlertMethod; detail: string; icon: typeof Mail }[] = [
  { name: "Email", detail: "Best for important, lasting updates", icon: Mail },
  { name: "SMS", detail: "Get a text when recovery begins", icon: Smartphone },
  { name: "WhatsApp", detail: "Receive alerts in WhatsApp", icon: MessageCircle },
  { name: "Browser notification", detail: "Alerts on this device", icon: BellRing },
];

async function unsubscribeRecoveryPass(pass: SavedRecoveryPass | null) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !pass?.unsubscribeToken) return;
  await fetch(`${base}/functions/v1/unsubscribe`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: pass.unsubscribeToken }),
  }).catch(() => null);
}

const optionalPreferenceCards: {
  key: Exclude<RecoveryCategory, "recovery">;
  title: string;
  description: string;
  icon: typeof Video;
}[] = [
  { key: "videos", title: "New videos", description: "Be first to know when a new upload drops.", icon: Video },
  { key: "livestreams", title: "Live streams", description: "Get a reminder before they go live.", icon: RadioTower },
  { key: "announcements", title: "Creator updates", description: "Big announcements and important news.", icon: Megaphone },
  { key: "products", title: "Official drops", description: "Merch, tickets, courses and exclusive releases.", icon: ShoppingBag },
];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function timeLabel(value: string) {
  const date = new Date(value);
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function PlatformMark({ id }: { id: string }) {
  const platform = getPlatform(id === "website" || id === "newsletter" ? "more" : id);
  const Icon = platform?.icon ?? Globe2;
  return <span className="fan-platform-mark" style={{ color: platform?.brandColor, background: platform?.brandBackground }}><Icon size={20} /></span>;
}

function Header() {
  return <header className="fan-nav">
    <AudienceOwnLogo className="fan-wordmark" size={24} />
    <div className="fan-nav-right">
      <span><i /> Verified creator page</span>
    </div>
  </header>;
}

function Profile({ creator, emergency = false, showUpdated = false }: { creator: CreatorRecord; emergency?: boolean; showUpdated?: boolean }) {
  return <div className="fan-profile">
    <div className={`fan-avatar ${emergency ? "fan-avatar-emergency" : ""}`}>
      {creator.avatar ? <span style={{ backgroundImage: `url(${creator.avatar})` }} /> : initials(creator.displayName)}
      <i><Check size={11} strokeWidth={3} /></i>
    </div>
    <div>
      <div className="fan-profile-name">{creator.displayName} <ShieldCheck size={17} /></div>
      <p>@{creator.handle}</p>
      {showUpdated && <small>Last updated {timeLabel(creator.lastVerifiedAt)}</small>}
    </div>
  </div>;
}

function OfficialLinks({ creator, heading = "Official accounts" }: { creator: CreatorRecord; heading?: string }) {
  return <section className="fan-section" id="official-accounts">
    <div className="fan-section-heading">
      <div><p className="fan-kicker">Verified destinations</p><h2>{heading}</h2></div>
      <span>{creator.officialLinks.length} active</span>
    </div>
    <div className="fan-links">
      {creator.officialLinks.map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={link.id} className="fan-link-card">
        <PlatformMark id={link.id} />
        <span><small>{link.platform}</small><strong>{link.label}</strong></span>
        <b>{link.action} <ExternalLink size={13} /></b>
      </a>)}
    </div>
  </section>;
}

function VerifiedIdentity({graph,emergency}:{graph:PublicIdentityGraph;emergency:boolean}){const trust=graph.trust;if(trust?.state==="restricted")return <section className="mx-auto my-8 max-w-3xl px-5"><div className="surface rounded-xl p-5"><p className="fan-kicker">Identity safety</p><h2 className="mt-1 text-xl font-semibold">Identity verification unavailable</h2><p className="mt-1 text-sm text-zinc-400">Verified identity badges are temporarily unavailable. Follow active emergency guidance shown on this page.</p></div></section>;if(!graph.accounts.length&&!graph.domains.length)return null;return <section className="mx-auto my-8 max-w-3xl px-5" aria-labelledby="verified-identity-title"><div className="surface rounded-xl p-5"><div className="flex items-start justify-between gap-3"><div><p className="fan-kicker">{trust?.label??"Verified identity"}</p><h2 id="verified-identity-title" className="mt-1 text-xl font-semibold">Official accounts and domains</h2><p className="mt-1 text-sm text-zinc-400">{trust?.summary??"These destinations have been verified as belonging to this creator."}</p></div><ShieldCheck className="text-emerald-300" size={24}/></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{graph.accounts.map(account=><a href={account.canonicalProfileUrl} target="_blank" rel="noreferrer" key={`${account.provider}-${account.canonicalProfileUrl}`} className={`rounded-lg border p-3 ${emergency&&account.accountKind==="replacement_account"?"border-emerald-400/50 bg-emerald-400/5":"border-white/10"}`}><small className="uppercase text-zinc-500">{account.provider}</small><strong className="mt-1 block">{account.displayHandle??account.displayName??"Official account"}</strong><span className="mt-2 block text-xs text-emerald-300">{account.accountKind==="replacement_account"?"Replacement account":account.official?"Verified official":"Verified account"}{account.primary?" · Primary account":""}</span></a>)}{graph.domains.map(domain=><a href={domain.canonicalUrl} target="_blank" rel="noreferrer" key={domain.hostname} className="rounded-lg border border-white/10 p-3"><small className="uppercase text-zinc-500">Website</small><strong className="mt-1 block">{domain.hostname}</strong><span className="mt-2 block text-xs text-emerald-300">Verified domain{domain.primary?" · Primary":""}</span></a>)}</div>{graph.relationships.length>0&&<p className="mt-4 text-xs text-zinc-500">Identity continuity includes {graph.relationships.length} verified replacement or migration relationship{graph.relationships.length===1?"":"s"}.</p>}</div></section>}

function useDialogFocusTrap(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const selector = "button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex='-1'])";
    const first = dialog.querySelector<HTMLElement>(selector);
    first?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialog!.querySelectorAll<HTMLElement>(selector)];
      if (!focusable.length) return;
      const firstItem = focusable[0];
      const lastItem = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [onClose]);
  return dialogRef;
}

function PreferenceCards({ preferences, onChange }: {
  preferences: RecoveryPreferences;
  onChange: (preferences: RecoveryPreferences) => void;
}) {
  return <>
    <article className="required-alert-card">
      <div className="preference-icon"><ShieldCheck size={22} /></div>
      <div><div className="preference-title"><h3>Never lose this creator</h3><span>Always On</span></div><p>If this creator gets hacked, banned, suspended, deleted or moves to a new account, AudienceOwn will always show you their real verified account.</p><small>This is the promise of your Recovery Pass.</small></div>
      <CheckCircle2 className="required-check" size={21} aria-hidden="true" />
    </article>
    <div className="optional-heading"><h3>Don’t miss a moment</h3><p>Everything below is optional.</p></div>
    <div className="optional-preference-grid">
      {optionalPreferenceCards.map(({ key, title, description, icon: Icon }) => {
        const enabled = preferences[key];
        return <label key={key} className={`optional-preference-card ${enabled ? "selected" : ""}`}>
          <input type="checkbox" checked={enabled} onChange={(event) => onChange({ ...preferences, recovery: true, [key]: event.target.checked })} />
          <span className="preference-icon"><Icon size={20} /></span>
          <span className="preference-copy"><strong>{title}</strong><small>{description}</small></span>
          <span className="preference-toggle" aria-hidden="true"><i /></span>
        </label>;
      })}
    </div>
  </>;
}

function SaveModal({ creator, source, onClose, onSaved, onManage }: { creator: CreatorRecord; source?: string; onClose: () => void; onSaved: (member: number) => void; onManage: () => void }) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<AlertMethod>("Email");
  const [contact, setContact] = useState("");
  const [contactTouched, setContactTouched] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [pushError, setPushError] = useState<BrowserPushErrorCode | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [smsCountry, setSmsCountry] = useState("US");
  const [smsSessionToken, setSmsSessionToken] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState("");
  const [smsMasked, setSmsMasked] = useState("");
  const [smsStatus, setSmsStatus] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsResendSeconds, setSmsResendSeconds] = useState(0);
  const [smsTokens, setSmsTokens] = useState<{ preferenceToken: string; unsubscribeToken: string } | null>(null);
  const [whatsAppConsent, setWhatsAppConsent] = useState(false);
  const [activationToken, setActivationToken] = useState<string>();
  const [preferences, setPreferences] = useState<RecoveryPreferences>(() =>
    readSavedRecoveryPass(creator.handle)?.preferences ?? { ...DEFAULT_RECOVERY_PREFERENCES },
  );
  const memberNumber = useMemo(() => creator.recoveryCoreFans + 1, [creator.recoveryCoreFans]);
  const dialogRef = useDialogFocusTrap(onClose);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const contactValid = isValidRecoveryContact(method, contact);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (smsResendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setSmsResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [smsResendSeconds]);

  async function smsRequest(action: "start" | "verify" | "resend" | "cancel") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) {
      setSmsStatus(`${method} verification is currently unavailable.`);
      return null;
    }
    setSmsBusy(true);
    setSmsStatus("");
    try {
      const body = action === "start"
        ? {
          action,
          slug: creator.handle,
          phone: contact,
          country: smsCountry,
          consent: method === "WhatsApp" ? whatsAppConsent : true,
          consentVersion: method === "WhatsApp"
            ? "whatsapp-recovery-v1"
            : "sms-recovery-v1",
          source_platform: normaliseSource(source),
          source_referrer: document.referrer || null,
          landing_path: window.location.pathname,
          preferences,
        }
        : { action, sessionToken: smsSessionToken, ...(action === "verify" ? { code: smsCode } : {}) };
      const verificationFunction = method === "WhatsApp"
        ? "whatsapp-verification"
        : "sms-verification";
      const response = await fetch(`${base}/functions/v1/${verificationFunction}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as {
        status: string;
        sessionToken?: string;
        maskedPhone?: string;
        resendAfterSeconds?: number;
        preferenceToken?: string;
        unsubscribeToken?: string;
      };
      if (result.status === "code_sent") {
        setSmsSessionToken(result.sessionToken ?? smsSessionToken);
        setSmsMasked(result.maskedPhone ?? smsMasked);
        setSmsResendSeconds(result.resendAfterSeconds ?? 30);
        setSmsStatus(`Verification code sent to ${result.maskedPhone ?? smsMasked}.`);
      } else if (result.status === "verified"
        && result.preferenceToken && result.unsubscribeToken) {
        setSmsTokens({
          preferenceToken: result.preferenceToken,
          unsubscribeToken: result.unsubscribeToken,
        });
        setSmsMasked(result.maskedPhone ?? smsMasked);
        setSmsStatus("Phone number verified.");
        setStep(3);
      } else {
        const messages: Record<string, string> = {
          invalid_phone: "Enter a valid phone number and confirm its country.",
          invalid_code: "That verification code is not valid.",
          expired_code: "That code expired. Change the number and start again.",
          too_many_attempts: "Too many attempts. Please wait before trying again.",
          rate_limited: "Please wait before requesting another code.",
          provider_unavailable: `${method} verification is temporarily unavailable.`,
        };
        setSmsStatus(messages[result.status] ?? "SMS verification could not be completed.");
      }
      return result;
    } catch {
      setSmsStatus(`${method} verification is temporarily unavailable.`);
      return null;
    } finally {
      setSmsBusy(false);
    }
  }

  async function enableNotifications() {
    setPushBusy(true);
    setPushError(null);
    const result = await enableBrowserPush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "");
    setPushBusy(false);
    if (!result.ok) {
      setPushError(result.code);
      return;
    }
    setPushSubscription(result.subscription);
    setContact("This browser");
  }

  async function finish() {
    let preferenceToken: string | undefined;
    let unsubscribeToken: string | undefined;
    if (method === "Email") {
      try {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!base) throw new Error("missing_server");
        const response = await fetch(`${base}/functions/v1/subscribe`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: creator.handle, email: contact, consent: true,
            source_platform: normaliseSource(source), landing_path: window.location.pathname,
            source_referrer: document.referrer || null, preferences }),
        });
        if (!response.ok) throw new Error("registration_failed");
        const registration = await response.json() as { preferenceToken?: string; unsubscribeToken?: string };
        preferenceToken = registration.preferenceToken;
        unsubscribeToken = registration.unsubscribeToken;
      } catch {
        setStep(2); setContactTouched(true); return;
      }
    }
    if (method === "Browser notification") {
      if (!pushSubscription) {
        setStep(2);
        setPushError("subscription_failed");
        return;
      }
      try {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!base) throw new Error("missing_server");
        const response = await fetch(`${base}/functions/v1/subscribe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug: creator.handle,
            subscription: pushSubscription.toJSON(),
            consent: true,
            source_platform: normaliseSource(source),
            landing_path: window.location.pathname,
            source_referrer: document.referrer || null,
            preferences,
          }),
        });
        if (!response.ok) throw new Error("registration_failed");
        const registration = await response.json() as { preferenceToken?: string; unsubscribeToken?: string };
        preferenceToken = registration.preferenceToken;
        unsubscribeToken = registration.unsubscribeToken;
      } catch {
        setStep(2);
        setPushError("server_registration_failed");
        return;
      }
    }
    if (method === "SMS" || method === "WhatsApp") {
      if (!smsTokens) {
        setStep(2);
        setSmsStatus(`Verify your phone number before activating ${method}.`);
        return;
      }
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (base) {
        await fetch(`${base}/functions/v1/preferences`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: smsTokens.preferenceToken,
            preferences: { ...preferences, recovery: true },
          }),
        }).catch(() => null);
      }
      preferenceToken = smsTokens.preferenceToken;
      unsubscribeToken = smsTokens.unsubscribeToken;
    }
    saveRecoveryPass(creator.handle, {
      method, contact: method === "Browser notification"
        ? "This browser"
        : method === "SMS" || method === "WhatsApp"
          ? smsMasked
          : contact,
      consent: true, memberNumber, savedAt: new Date().toISOString(), source,
      preferences: { ...preferences, recovery: true },
      preferenceToken,
      unsubscribeToken,
    });
    setActivationToken(preferenceToken);
    setStep(4);
    onSaved(memberNumber);
  }

  return <div className="pass-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div ref={dialogRef} className={`pass-modal premium-pass-modal step-${step}`} role="dialog" aria-modal="true" aria-labelledby="pass-flow-heading">
      <div className="pass-modal-top">
        <AudienceOwnLogo className="fan-wordmark" size={24} />
        {step < 4 && <span>Step {step} of 3</span>}
        <button onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>
      {step < 4 && <div className="pass-progress"><i style={{ width: `${step / 3 * 100}%` }} /></div>}
      <div className="pass-modal-body">
        {step === 1 && <>
          <p className="fan-kicker">Save your Recovery Pass</p>
          <h2 id="pass-flow-heading" ref={headingRef} tabIndex={-1}>Choose recovery method</h2>
          <p className="pass-intro">Choose one private channel for important recovery alerts from {creator.displayName}.</p>
          <div className="pass-methods">{methods.map(({ name, detail, icon: Icon }) => <button key={name} aria-pressed={method === name} onClick={() => setMethod(name)} className={method === name ? "selected" : ""}>
            <i><Icon size={19} /></i><span><strong>{name}</strong><small>{detail}</small></span><b aria-hidden="true">{method === name && <Check size={14} />}</b>
          </button>)}</div>
          <button className="button button-primary pass-next" onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>
        </>}
        {step === 2 && <>
          <button className="pass-back" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
          <p className="fan-kicker">Your {method.toLowerCase()}</p>
          <h2 id="pass-flow-heading" ref={headingRef} tabIndex={-1}>{method === "Browser notification" ? "Confirm this device" : "Where should we send alerts?"}</h2>
          <p className="pass-intro">We’ll use this only for your Recovery Pass and the updates you choose.</p>
          <label className="label" htmlFor="fan-contact">{method === "Email" ? "Email address" : method === "Browser notification" ? "Device" : "Mobile number"}</label>
          {method === "Browser notification"
            ? <div>
              <button type="button" className="pass-device" disabled={pushBusy || Boolean(pushSubscription)} onClick={enableNotifications}>
                <BellRing size={18} /><span><strong>{pushSubscription ? "Browser notifications enabled" : "Enable browser notifications"}</strong><small>Browser notifications work on this browser and device.</small></span>{pushSubscription && <CheckCircle2 size={18} />}
              </button>
              {!browserPushSupport().supported && <p className="pass-validation" role="status">This browser does not support browser notifications.</p>}
              {pushError === "permission_denied" && <p className="pass-validation" role="status">Notifications are blocked. Allow them in this browser’s site settings, then reconnect.</p>}
              {pushError && pushError !== "permission_denied" && <p className="pass-validation" role="status">Browser notifications could not be enabled. Please try reconnecting.</p>}
              <p className="pass-privacy">Clearing browser data, changing browsers, or revoking permission disables this Recovery Pass on this device.</p>
            </div>
            : method === "SMS" || method === "WhatsApp"
              ? <div>
                {!smsSessionToken && <>
                  <label className="label" htmlFor="sms-country">Country context</label>
                  <select id="sms-country" className="input pass-contact" value={smsCountry} onChange={(event) => setSmsCountry(event.target.value)}>
                    <option value="US">United States (+1)</option>
                    <option value="CA">Canada (+1)</option>
                    <option value="GB">United Kingdom (+44)</option>
                    <option value="DE">Germany (+49)</option>
                    <option value="GH">Ghana (+233)</option>
                    <option value="NG">Nigeria (+234)</option>
                  </select>
                  <label className="label manage-contact-label" htmlFor="fan-contact">Mobile number</label>
                  <input id="fan-contact" className="input pass-contact" type="tel" inputMode="tel" autoComplete="tel" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="+1 555 000 0000" />
                  <div className="mt-4 rounded-xl border border-zinc-700 p-4 text-xs leading-5 text-zinc-400">
                    {method === "WhatsApp"
                      ? "Receive emergency recovery alerts from this creator through WhatsApp. This is not for marketing or general newsletters. You can remove this Recovery Pass at any time. We’ll send a WhatsApp verification code to confirm you control this number."
                      : "We’ll text a verification code to confirm you control this number. It will be used only for recovery alerts you select. Message and data rates may apply. Availability depends on your mobile network. You can remove SMS at any time; replying STOP disables future messages."}
                  </div>
                  {method === "WhatsApp" && <label className="mt-4 flex items-start gap-3 text-sm leading-5">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={whatsAppConsent}
                      onChange={(event) => setWhatsAppConsent(event.target.checked)}
                    />
                    <span>I agree to receive emergency recovery alerts from this creator through WhatsApp.</span>
                  </label>}
                  <button type="button" className="button button-primary pass-next" disabled={smsBusy || !contact.trim() || (method === "WhatsApp" && !whatsAppConsent)} onClick={() => smsRequest("start")}>Send verification code</button>
                </>}
                {smsSessionToken && !smsTokens && <>
                  <p className="pass-privacy">Code sent to {smsMasked}. Enter it below.</p>
                  <label className="label" htmlFor="sms-code">Verification code</label>
                  <input id="sms-code" className="input pass-contact" type="text" inputMode="numeric" autoComplete="one-time-code" value={smsCode} onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, "").slice(0, 10))} />
                  <button type="button" className="button button-primary pass-next" disabled={smsBusy || smsCode.length < 4} onClick={() => smsRequest("verify")}>Verify</button>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="button button-secondary" disabled={smsBusy || smsResendSeconds > 0} onClick={() => smsRequest("resend")}>{smsResendSeconds > 0 ? `Resend in ${smsResendSeconds}s` : "Resend code"}</button>
                    <button type="button" className="button button-secondary" onClick={() => { void smsRequest("cancel"); setSmsSessionToken(null); setSmsCode(""); setSmsStatus(""); }}>Change number</button>
                    <button type="button" className="button button-secondary" onClick={() => { void smsRequest("cancel"); onClose(); }}>Cancel</button>
                  </div>
                </>}
                {smsStatus && <p className="pass-validation" role="status">{smsStatus}</p>}
              </div>
            : <input id="fan-contact" className="input pass-contact" type={method === "Email" ? "email" : "tel"} inputMode={method === "Email" ? "email" : "tel"} autoComplete={method === "Email" ? "email" : "tel"} autoCapitalize="none" spellCheck={false} aria-invalid={contactTouched && !contactValid} aria-describedby={contactTouched && !contactValid ? "contact-error" : undefined} placeholder={method === "Email" ? "you@example.com" : "+1 555 000 0000"} value={contact} onBlur={() => setContactTouched(true)} onChange={(e) => setContact(e.target.value)} />}
          {contactTouched && !contactValid && <p id="contact-error" className="pass-validation" role="alert">{method === "Email" ? "Enter a valid email address." : "Enter a valid mobile number."}</p>}
          {method !== "SMS" && method !== "WhatsApp" && <button className="button button-primary pass-next" disabled={method === "Browser notification" ? !pushSubscription : !contactValid} onClick={() => setStep(3)}>Choose my alerts <ArrowRight size={16} /></button>}
          <p className="pass-privacy">No password. No newsletter. You control every alert.</p>
        </>}
        {step === 3 && <>
          <button className="pass-back" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back</button>
          <p className="fan-kicker">Your Connection</p>
          <h2 id="pass-flow-heading" ref={headingRef} tabIndex={-1}>Choose how you want to stay connected</h2>
          <p className="pass-intro">Your Recovery Pass protects your connection.<br />Choose what else you’d like to hear about from this creator.</p>
          <PreferenceCards preferences={preferences} onChange={setPreferences} />
        </>}
        {step === 4 && <div className="pass-success">
          <div className="pass-success-icon"><ShieldCheck size={29} /></div>
          <p className="fan-kicker">Protected connection</p>
          <h2 id="pass-flow-heading" ref={headingRef} tabIndex={-1}>Recovery Pass activated</h2>
          <p>You’ll always know where to find this creator if an account is hacked, banned, removed, or moved.</p>
          <div className="activation-summary">
            <span><strong>Recovery alerts</strong><b>Enabled</b></span>
            {optionalPreferenceCards.map(({ key, title }) => <span key={key}><strong>{title}</strong><b className={preferences[key] ? "enabled" : ""}>{preferences[key] ? "Enabled" : "Off"}</b></span>)}
          </div>
          <RecoveryPassDestinations slug={creator.handle} preferenceToken={activationToken} />
          <div className="pass-success-actions"><button className="button button-primary" onClick={onClose}>Done</button><button className="button button-secondary" onClick={onManage}>Manage Recovery Pass</button></div>
        </div>}
      </div>
      {step === 3 && <div className="pass-activation-action">
        <button className="button button-primary" onClick={finish}>Activate My Recovery Pass <ShieldCheck size={17} /></button>
        <p>Recovery protection is always included.<br />Everything else is your choice.</p>
      </div>}
    </div>
  </div>;
}

function ManagePassModal({ creator, initialMode, onClose, onDeactivate, onSaved }: {
  creator: CreatorRecord;
  initialMode: "methods" | "preferences";
  onClose: () => void;
  onDeactivate: () => void;
  onSaved: () => void;
}) {
  const stored = readSavedRecoveryPass(creator.handle);
  const [method, setMethod] = useState(stored?.method ?? "Email");
  const [contact, setContact] = useState(stored?.contact ?? "");
  const [preferences, setPreferences] = useState<RecoveryPreferences>(stored?.preferences ?? { ...DEFAULT_RECOVERY_PREFERENCES });
  const [saved, setSaved] = useState(false);
  const [reconnectState, setReconnectState] = useState<"idle" | "working" | "done" | "error">("idle");
  const dialogRef = useDialogFocusTrap(onClose);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(onSaved, 1000);
    return () => window.clearTimeout(timer);
  }, [onSaved, saved]);

  function persist() {
    updateSavedRecoveryPass(creator.handle, {
      method,
      contact,
      preferences: { ...preferences, recovery: true },
    });
    setSaved(true);
  }

  async function reconnect() {
    setReconnectState("working");
    const enabled = await enableBrowserPush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "");
    if (!enabled.ok || !stored?.preferenceToken) {
      setReconnectState("error");
      return;
    }
    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!base) throw new Error("missing_server");
      const response = await fetch(`${base}/functions/v1/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: creator.handle,
          subscription: enabled.subscription.toJSON(),
          preferenceToken: stored.preferenceToken,
          consent: true,
          source_platform: normaliseSource(stored.source),
          landing_path: window.location.pathname,
          source_referrer: null,
          preferences,
        }),
      });
      if (!response.ok) throw new Error("registration_failed");
      const result = await response.json() as { preferenceToken?: string };
      updateSavedRecoveryPass(creator.handle, {
        contact: "This browser",
        preferenceToken: result.preferenceToken ?? stored.preferenceToken,
      });
      setReconnectState("done");
    } catch {
      setReconnectState("error");
    }
  }

  async function deactivate() {
    if (!window.confirm(`Deactivate your Recovery Pass for ${creator.displayName}?`)) return;
    if (stored?.method === "Browser notification" && stored.preferenceToken) {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (base) {
        await fetch(`${base}/functions/v1/browser-push`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "revoke", preferenceToken: stored.preferenceToken }),
        }).catch(() => null);
      }
      await unsubscribeBrowserPush();
    }
    if ((stored?.method === "SMS" || stored?.method === "WhatsApp") && stored.preferenceToken) {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (base) {
        const verificationFunction = stored.method === "WhatsApp"
          ? "whatsapp-verification"
          : "sms-verification";
        await fetch(`${base}/functions/v1/${verificationFunction}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "remove", preferenceToken: stored.preferenceToken }),
        }).catch(() => null);
      }
    }
    await unsubscribeRecoveryPass(stored);
    removeSavedRecoveryPass(creator.handle);
    onDeactivate();
  }

  return <div className="pass-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div ref={dialogRef} className="pass-modal manage-pass-modal" role="dialog" aria-modal="true" aria-label="Manage Recovery Pass">
      <div className="pass-modal-top">
        <span className="fan-wordmark"><Settings2 size={17} /> Manage Recovery Pass</span>
        <button onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>
      <div className="pass-modal-body">
        <p className="fan-kicker">Recovery Pass Active</p>
        <h2>{initialMode === "methods" ? "Update notification methods" : "Update what I hear about"}</h2>
        <div className="manage-pass-section">
          <label className="label" htmlFor="manage-method">Notification method</label>
          <select id="manage-method" className="input" value={method} onChange={(event) => setMethod(event.target.value)}>
            {methods.map((item) => <option key={item.name} disabled={item.name !== stored?.method}>{item.name}</option>)}
          </select>
          <p className="pass-privacy">To replace this Recovery Pass with a different method, remove it and complete that method’s verification flow.</p>
          <label className="label manage-contact-label" htmlFor="manage-contact">{method === "Email" ? "Email address" : method === "Browser notification" ? "Device" : "Mobile number"}</label>
          <input id="manage-contact" className="input" value={contact} disabled={method === "Browser notification"} onChange={(event) => setContact(event.target.value)} placeholder={method === "Browser notification" ? "This browser" : method === "Email" ? "you@example.com" : "+1 555 000 0000"} />
          {method === "Browser notification" && <div>
            <button type="button" className="button button-secondary mt-3" disabled={reconnectState === "working"} onClick={reconnect}>
              <RotateCcw size={15} /> {reconnectState === "done" ? "Reconnected" : "Reconnect this browser"}
            </button>
            {reconnectState === "error" && <p className="pass-validation" role="status">Reconnect failed. Check this browser’s notification permission and try again.</p>}
            <p className="pass-privacy">This Recovery Pass is active only on this browser and device.</p>
          </div>}
        </div>
        <div className="manage-pass-section"><PreferenceCards preferences={preferences} onChange={setPreferences} /></div>
        <button className={`button button-primary pass-next ${saved ? "manage-save-success" : ""}`} onClick={persist} disabled={saved}>{saved ? <><CheckCircle2 size={16} /> Changes saved</> : "Save changes"}</button>
        <button className="manage-deactivate" onClick={deactivate}><Trash2 size={15} /> Deactivate Recovery Pass</button>
      </div>
    </div>
  </div>;
}

function DeveloperTools({ creator, onReset, onResetPreferences, onClearSource, onSimulate }: {
  creator: CreatorRecord;
  onReset: () => void;
  onResetPreferences: () => void;
  onClearSource: () => void;
  onSimulate: () => void;
}) {
  const [message, setMessage] = useState("");
  function run(action: () => void, confirmation: string) {
    action();
    setMessage(confirmation);
  }
  return <section className="developer-tools" aria-label="Developer Tools">
    <div><p className="fan-kicker">Private testing</p><h2>Developer Tools</h2><p>Local controls for @{creator.handle}. Never shown to public production visitors.</p></div>
    <div className="developer-actions">
      <button onClick={() => run(onReset, "Recovery Pass reset.")}><RotateCcw size={15} /> Reset Recovery Pass</button>
      <button onClick={() => run(onResetPreferences, "Notification preferences reset.")}><BellRing size={15} /> Reset notification preferences</button>
      <button onClick={() => run(onClearSource, "Source attribution cleared.")}><X size={15} /> Clear source attribution</button>
      <button onClick={() => run(onSimulate, "First-time visitor simulated.")}><Users size={15} /> Simulate first-time visitor</button>
    </div>
    {message && <p className="developer-message" role="status">{message}</p>}
  </section>;
}

type RecoveryPassDisplayStatus =
  | { kind: "protected"; label: "Protected"; detail: "Everything looks normal." }
  | { kind: "recovery"; label: "Recovery Alert"; detail: string; destination?: string };

function formatActivationDate(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function RecoveryPassStatusCard({ creator, pass, status }: {
  creator: CreatorRecord;
  pass: SavedRecoveryPass;
  status: RecoveryPassDisplayStatus;
}) {
  const preferences = pass.preferences ?? DEFAULT_RECOVERY_PREFERENCES;
  const methodLabel = pass.method === "Browser notification" ? "Browser notification" : pass.method;
  return <section className={`recovery-status-card status-${status.kind}`}>
    <div className="recovery-status-card-head">
      <div><p>Protection status</p><h2><span className="status-dot" /> {status.label}</h2><small>{status.detail}</small></div>
      <div className="status-shield"><ShieldCheck size={27} /></div>
    </div>
    <dl className="recovery-pass-details">
      <div><dt>Creator</dt><dd>{creator.displayName}</dd></div>
      <div><dt>Recovery method</dt><dd>{methodLabel}</dd></div>
      <div><dt>Recovery alerts</dt><dd className="always-active"><CheckCircle2 size={14} /> Always active</dd></div>
      <div><dt>Activated</dt><dd>{formatActivationDate(pass.savedAt)}</dd></div>
    </dl>
    <div className="status-updates">
      <h3>Creator updates</h3>
      <div>
        {optionalPreferenceCards.map(({ key, title }) => <span key={key}><small>{title}</small><b className={preferences[key] ? "on" : "off"}>{preferences[key] ? <Check size={13} /> : "—"}</b></span>)}
      </div>
    </div>
    <div className="status-check-time"><Activity size={15} /><span><small>Last status check</small><strong>Today</strong></span></div>
  </section>;
}

function RecoveryPassStatusPage({ creator, pass, onManage, onDeactivate }: {
  creator: CreatorRecord;
  pass: SavedRecoveryPass;
  onManage: (mode: "methods" | "preferences") => void;
  onDeactivate: () => void;
}) {
  const status: RecoveryPassDisplayStatus = {
    kind: "protected",
    label: "Protected",
    detail: "Everything looks normal.",
  };
  return <main className="recovery-status-page">
    <section className="recovery-status-hero">
      <div className="recovery-active-pill"><span /> Recovery Pass Active</div>
      <Profile creator={creator} />
      <h1>Your connection to <span>{creator.displayName}</span> is protected.</h1>
      <p>If this creator is ever hacked, banned, suspended, deleted, or moves to another verified account, AudienceOwn will guide you to the correct destination and notify you using your selected alert methods.</p>
    </section>
    <RecoveryPassStatusCard creator={creator} pass={pass} status={status} />
    <RecoveryPassDestinations slug={creator.handle} preferenceToken={pass.preferenceToken} />
    <section className="normal-status-card">
      <div className="normal-status-icon"><CheckCircle2 size={21} /></div>
      <div><p>Recovery status</p><h2>Everything looks normal</h2><span>{creator.displayName}’s verified accounts are active.</span></div>
      <div className="normal-status-date"><CalendarDays size={15} /> Last checked <strong>Today</strong></div>
    </section>
    <section className="recovery-status-actions">
      <div><p className="fan-kicker">Your Recovery Pass</p><h2>Keep your connection current</h2></div>
      <div>
        <button className="button button-primary" onClick={() => onManage("methods")}><BellRing size={17} /> Update notification methods</button>
        <button className="button button-secondary" onClick={() => onManage("preferences")}><Settings2 size={17} /> Update what I hear about</button>
        <button className="active-pass-deactivate" onClick={onDeactivate}><Trash2 size={15} /> Deactivate Recovery Pass</button>
      </div>
    </section>
  </main>;
}

function HealthyPage({ creator, pass, onSave, onManage, onDeactivate }: {
  creator: CreatorRecord;
  pass: SavedRecoveryPass | null;
  onSave: () => void;
  onManage: (mode: "methods" | "preferences") => void;
  onDeactivate: () => void;
}) {
  if (pass) return <RecoveryPassStatusPage creator={creator} pass={pass} onManage={onManage} onDeactivate={onDeactivate} />;
  return <>
    <section className="fan-hero">
      {/* Creator-managed image hosts are dynamic and cannot be safely enumerated for next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {creator.bannerImagePath && <img src={creator.bannerImagePath} alt="" className="absolute inset-x-0 top-0 h-48 w-full object-cover opacity-20" />}
      <div className="fan-orbit fan-orbit-one" /><div className="fan-orbit fan-orbit-two" />
      <div className="fan-hero-inner">
        <Profile creator={creator} />
        {creator.bio && <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-300">{creator.bio}</p>}
        <div className="fan-status fan-status-online" aria-live="polite"><i /> Verified creator</div>
        <h1><span>{creator.recoveryPassName??creator.displayName}</span></h1>
        {creator.tagline&&<p className="fan-hero-tagline">{creator.tagline}</p>}
        <p className="fan-hero-promise"><span>Creators get hacked. Accounts get banned.</span><span>Profiles disappear.</span><span>Save one pass. Always find the real, verified destination.</span></p>
        <div className="fan-actions">
          <button className="button button-primary" onClick={onSave}><ShieldCheck size={17} /> Save My Recovery Pass</button>
          <a className="button fan-why-button" href="#why-this-matters">Why this matters <ChevronRight size={16} /></a>
        </div>
        <div className="fan-trust"><span><Users size={14} /> {creator.recoveryCoreFans.toLocaleString()} fans protected</span><span><ShieldCheck size={14} /> Verified by AudienceOwn</span></div>
      </div>
    </section>
    <main className="fan-content">
      {creator.announcement && <section className="surface mb-8 rounded-xl p-5">
        <p className="fan-kicker">Latest announcement</p>
        {creator.announcement.title && <h2 className="mt-1 text-xl font-semibold">{creator.announcement.title}</h2>}
        {creator.announcement.body && <p className="mt-2 whitespace-pre-line text-sm text-zinc-400">{creator.announcement.body}</p>}
        {creator.announcement.ctaUrl && <a href={creator.announcement.ctaUrl} target="_blank" rel="noreferrer" className="button button-secondary mt-4">{creator.announcement.ctaLabel || "Learn more"} <ExternalLink size={14} /></a>}
      </section>}
      <section className="fan-how" id="why-this-matters">
        <div><p className="fan-kicker">Always know where to go</p><h2>What happens when you save this pass?</h2></div>
        <ol>
          {[
            ["Stay connected", "If they disappear from one platform, you’ll know where they went."],
            ["One trusted page", "Always return to the same verified place."],
            ["Only verified accounts", "No fake recovery profiles. No guessing."],
            ["Protected forever", "Your Recovery Pass stays connected to this creator."],
          ].map(([title, copy], index) => <li key={title}><i>0{index + 1}</i><span><strong>{title}</strong><small>{copy}</small></span></li>)}
        </ol>
      </section>
      <section className="fan-bottom-cta">
        <ShieldCheck size={25} />
        <h2>{`Keep ${creator.displayName} within reach.`}</h2>
        <p>One tap today.<br />Know where they are tomorrow.</p>
        <button className="button button-primary" onClick={onSave}><ShieldCheck size={17} /> Save My Recovery Pass</button>
      </section>
    </main>
  </>;
}

function EmergencyPage({ creator }: { creator: CreatorRecord }) {
  const route = creator.recoveryRoutes[creator.affectedPlatform?.toLowerCase() ?? ""];
  return <>
    <section className="emergency-hero">
      <div className="emergency-beam" />
      <div className="fan-hero-inner">
        <div className="fan-status fan-status-emergency"><Radio size={13} /> Official Recovery Update</div>
        <h1><span>{creator.affectedPlatform}</span> is currently unavailable.</h1>
        <p>This is {creator.displayName}’s verified AudienceOwn recovery page.</p>
        <Profile creator={creator} emergency showUpdated />
      </div>
    </section>
    <main className="fan-content emergency-content">
      {creator.statusMessage && <div className="creator-note"><Radio size={18} /><p><small>Message from {creator.displayName}</small>{creator.statusMessage}</p></div>}
      {route && <section className="recovery-route">
        <div className="recovery-route-head"><div><p className="fan-kicker">Verified recovery route</p><h2>Where to follow next</h2></div><span>{creator.affectedPlatform} unavailable</span></div>
        <div className="recovery-primary">
          <div className="route-rank">01 <span>Primary route</span></div>
          <PlatformMark id={creator.affectedPlatform?.toLowerCase() ?? "more"} />
          <div><small>{route.primary.label}</small><strong>{route.primary.handle}</strong></div>
          <a className="button button-primary" href={route.primary.url} target="_blank" rel="noreferrer">Follow verified account <ExternalLink size={15} /></a>
        </div>
        {route.fallback && <div className="recovery-fallback">
          <div className="route-rank">02 <span>Fallback</span></div><PlatformMark id="website" />
          <div><small>{route.fallback.label}</small><strong>{route.fallback.handle}</strong></div>
          <a className="button button-secondary" href={route.fallback.url} target="_blank" rel="noreferrer">Visit backup website <ExternalLink size={15} /></a>
        </div>}
      </section>}
      <div className="fake-warning"><ShieldCheck size={20} /><div><strong>Avoid fake accounts.</strong><p>Only use destinations shown on this verified recovery page.</p></div></div>
      <OfficialLinks creator={creator} heading="More verified places" />
      <div className="last-verified"><CheckCircle2 size={20} /><p>Last verified by {creator.displayName}<small>{timeLabel(creator.lastVerifiedAt)}</small></p></div>
    </main>
  </>;
}

export function PublicCreatorExperience({ fallback, source, canUseDevTools = false, publicUpdates = [], identityGraph = null, authenticity = null }: {
  fallback: CreatorRecord;
  source?: string;
  canUseDevTools?: boolean;
  publicUpdates?: Array<{ id: string; title: string; content: string; ctaUrl: string | null; mediaUrl: string | null; sentAt: string }>;
  identityGraph?: PublicIdentityGraph | null;
  authenticity?: AuthenticityRecord | null;
}) {
  const [fanOffset, setFanOffset] = useState(0);
  const creator = useMemo(() => ({ ...fallback, recoveryCoreFans: fallback.recoveryCoreFans + fanOffset }), [fallback, fanOffset]);
  const [pass, setPass] = useState<SavedRecoveryPass | null>(null);
  const [modal, setModal] = useState(false);
  const [manageMode, setManageMode] = useState<"methods" | "preferences" | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPass(readSavedRecoveryPass(fallback.handle)));
    return () => window.cancelAnimationFrame(frame);
  }, [fallback.handle]);

  function markSaved() {
    setPass(readSavedRecoveryPass(creator.handle));
    setFanOffset((current) => current + 1);
  }

  async function deactivatePass(requireConfirmation = true) {
    if (requireConfirmation && !window.confirm(`Deactivate your Recovery Pass for ${creator.displayName}?`)) return;
    await unsubscribeRecoveryPass(readSavedRecoveryPass(creator.handle));
    removeSavedRecoveryPass(creator.handle);
    setPass(null);
    setManageMode(null);
  }

  return <div className={`fan-page ${creator.emergencyMode ? "fan-page-emergency" : ""}`}>
    <Header />
    {creator.emergencyMode ? <EmergencyPage creator={creator} /> : <HealthyPage creator={creator} pass={pass} onSave={() => setModal(true)} onManage={setManageMode} onDeactivate={() => deactivatePass()} />}
    {authenticity?<section className="mx-auto my-8 max-w-3xl px-5"><VerifiedCreatorCard record={authenticity} compact/></section>:identityGraph&&<VerifiedIdentity graph={identityGraph} emergency={creator.emergencyMode}/>}
    {publicUpdates.length > 0 && <section className="mx-auto my-8 max-w-3xl px-5">
      <p className="fan-kicker">Latest updates</p>
      <div className="mt-3 grid gap-3">{publicUpdates.map((update) => <article key={update.id} className="surface rounded-xl p-5">
        {/* Provider thumbnail hosts are dynamic and cannot be safely enumerated for next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {update.mediaUrl && <img src={update.mediaUrl} alt="" className="mb-4 aspect-video w-full rounded-lg object-cover"/>}
        <h2 className="text-xl font-semibold">{update.title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-zinc-400">{update.content}</p>
        {update.ctaUrl && <a href={update.ctaUrl} target="_blank" rel="noreferrer" className="button button-secondary mt-4">View update <ExternalLink size={14}/></a>}
      </article>)}</div>
    </section>}
    {canUseDevTools && <div className="developer-tools-wrap"><DeveloperTools
      creator={creator}
      onReset={() => deactivatePass(false)}
      onResetPreferences={() => { updateSavedRecoveryPass(creator.handle, { preferences: { ...DEFAULT_RECOVERY_PREFERENCES } }); setPass(readSavedRecoveryPass(creator.handle)); }}
      onClearSource={() => updateSavedRecoveryPass(creator.handle, { source: undefined })}
      onSimulate={() => setPass(null)}
    /></div>}
    {creator.emergencyMode && <footer className="fan-footer"><AudienceOwnLogo className="fan-wordmark" size={22} /><p>Permanent creator recovery infrastructure.</p><span>Verified • Private • Fan-first</span></footer>}
    {modal && <SaveModal creator={creator} source={source} onClose={() => setModal(false)} onSaved={markSaved} onManage={() => { setModal(false); setManageMode("preferences"); }} />}
    {manageMode && <ManagePassModal creator={creator} initialMode={manageMode} onClose={() => setManageMode(null)} onDeactivate={() => deactivatePass(false)} onSaved={() => { setPass(readSavedRecoveryPass(creator.handle)); setManageMode(null); }} />}
  </div>;
}
