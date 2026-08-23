"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BellRing, CalendarDays, Check, CheckCircle2, ChevronRight, ExternalLink, Lock, LockKeyhole, LogOut, Mail, Megaphone, Mic2, Network, Package, Play, Radio, Send, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { AudienceOwnLogo } from "@/components/logo";
import { getPlatform } from "@/lib/platforms";
import { providerAction, RECOVERY_PASS_CATEGORIES, type RecoveryPassCategory } from "@/lib/recovery-pass-actions";
import type { CreatorRecord } from "@/lib/public-creators";
import type { PublicRecoveryAccount } from "@/lib/recovery-pass-enrollment";
import type { RecoveryPassMemberState } from "@/lib/recovery-pass-member";
import { browserPushSupport, enableBrowserPush, unsubscribeBrowserPush } from "@/lib/browser-push-client";
import "./recovery-pass-flow.css";
import "./recovery-pass-stage-six-locking.css";

type Props = { creator: CreatorRecord; accounts: PublicRecoveryAccount[]; source?: string; memberState?: RecoveryPassMemberState | null };
type SavedFlow = { selected?: string[]; preferences?: RecoveryPassCategory[]; visited?: string[]; tokens?: { preferenceToken?: string; unsubscribeToken?: string } };
type SavedEmailChallenge = { challengeId: string; email: string; masked: string; resendAt: number; expiresAt: number };
export function stageSixCompletionState(selectedAccountReferences:string[],visitedAccountReferences:string[]){const selectedAccountCount=selectedAccountReferences.length,visitedAccountCount=selectedAccountReferences.filter(reference=>visitedAccountReferences.includes(reference)).length;return{selectedAccountCount,visitedAccountCount,allVisited:selectedAccountCount>0&&visitedAccountCount===selectedAccountCount};}
const categoryCopy: Record<RecoveryPassCategory, { title: string; description: (name: string) => string; icon: typeof Play }> = {
  videos: { title: "New videos", description: (name) => `Be among the first to know when ${name} shares something new to watch.`, icon: Play },
  livestreams: { title: "Livestreams", description: (name) => `Know when ${name} goes live so you can join them in the moment.`, icon: Radio },
  podcasts: { title: "Podcast episodes", description: (name) => `Hear when ${name} releases a new conversation or episode.`, icon: Mic2 },
  products: { title: "Product releases", description: (name) => `Discover what ${name} launches next.`, icon: Package },
  events: { title: "Events", description: () => "Stay informed about upcoming events, appearances, and opportunities to connect.", icon: CalendarDays },
  announcements: { title: "Announcements", description: (name) => `Receive important news and updates ${name} wants to share with their community.`, icon: Megaphone },
};

function Brand({ provider }: { provider: string }) {
  const platform = getPlatform(provider);
  const Icon = platform?.icon ?? ShieldCheck;
  return <span className="rp-brand" data-provider={platform?.id ?? "unknown"} style={{ color: platform?.brandColorOnLight ?? platform?.brandColor, background: platform?.brandBackground }}><Icon aria-hidden size={20} /></span>;
}

function maskEmail(value: string) { return value.replace(/^(.).+(@.+)$/, "$1••••$2"); }

export function RecoveryPassFlow({ creator, accounts, source, memberState }: Props) {
  const name = creator.displayName;
  const [stage, setStage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [preferences, setPreferences] = useState<RecoveryPassCategory[]>([]);
  const [recoveryAlerts, setRecoveryAlerts] = useState(true);
  const [pushState, setPushState] = useState<"default" | "working" | "enabled" | "denied" | "unsupported" | "failed">("default");
  const [tokens, setTokens] = useState<{ preferenceToken?: string; unsubscribeToken?: string }>({});
  const [emailCode, setEmailCode] = useState("");
  const [emailResendAt, setEmailResendAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [emailChallenge, setEmailChallenge] = useState<string>();
  const [emailMasked, setEmailMasked] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailNotice, setEmailNotice] = useState("");
  const [emailErrorKind, setEmailErrorKind] = useState<"default" | "expired">("default");
  const [visited, setVisited] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [managing, setManaging] = useState(false);
  const requestPending = useRef(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const chosen = useMemo(() => accounts.filter((account) => selected.includes(account.reference)), [accounts, selected]);
  const main = accounts.filter((account) => account.role === "main");
  const recovery = accounts.filter((account) => account.role === "recovery");
  const{selectedAccountCount,visitedAccountCount,allVisited}=stageSixCompletionState(chosen.map(account=>account.reference),visited);
  const reviewEmail = email
    ? maskEmail(email)
    : memberState?.deliveryMethods.find((method) => method.type === "email")?.masked ?? "";

  useEffect(() => {
    const saved = localStorage.getItem(`audienceown:recovery-flow:${creator.handle}`);
    if (!saved) return;
    queueMicrotask(() => {
      try {
        const state = JSON.parse(saved) as SavedFlow;
        setSelected(state.selected?.filter((ref) => accounts.some((account) => account.reference === ref)) ?? []);
        setPreferences(state.preferences?.filter((key) => RECOVERY_PASS_CATEGORIES.includes(key)) ?? []);
        setVisited(state.visited?.filter((ref) => accounts.some((account) => account.reference === ref)) ?? []);
        setTokens(state.tokens ?? {});
      } catch { /* ignore an invalid local convenience draft */ }
    });
  }, [accounts, creator.handle]);

  useEffect(() => {
    const saved = sessionStorage.getItem(`audienceown:recovery-email-challenge:${creator.handle}`);
    if (!saved) return;
    try {
      const challenge = JSON.parse(saved) as SavedEmailChallenge;
      if (challenge.expiresAt <= Date.now()) {
        sessionStorage.removeItem(`audienceown:recovery-email-challenge:${creator.handle}`);
        return;
      }
      queueMicrotask(() => {
        setEmail(challenge.email);
        setEmailChallenge(challenge.challengeId);
        setEmailMasked(challenge.masked);
        setEmailResendAt(challenge.resendAt);
        setClock(Date.now());
        setStage(3);
      });
    } catch { sessionStorage.removeItem(`audienceown:recovery-email-challenge:${creator.handle}`); }
  }, [creator.handle]);

  useEffect(() => {
    localStorage.setItem(`audienceown:recovery-flow:${creator.handle}`, JSON.stringify({ selected, preferences, visited, tokens }));
  }, [creator.handle, preferences, selected, tokens, visited]);

  useEffect(() => {
    if (!emailResendAt || emailResendAt <= clock) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [clock, emailResendAt]);

  useEffect(() => {
    const support = browserPushSupport();
    if (!support.supported) queueMicrotask(() => setPushState("unsupported"));
    else if (support.permission === "denied") queueMicrotask(() => setPushState("denied"));
  }, []);

  function toggleAccount(reference: string) { setSelected((value) => value.includes(reference) ? value.filter((item) => item !== reference) : [...value, reference]); }
  function togglePreference(key: RecoveryPassCategory) { setPreferences((value) => value.includes(key) ? value.filter((item) => item !== key) : [...value, key]); }
  function advance() { setError(""); setStage((value) => managing && value === 1 ? 4 : value + 1); }

  async function updatePush(action: "register" | "disable") {
    setPushState("working"); setError("");
    try {
      if (action === "disable") {
        const response = await fetch("/api/public/recovery-pass/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, slug: creator.handle }) });
        if (!response.ok) throw new Error("Push notifications could not be disabled.");
        await unsubscribeBrowserPush();
        setPushState("default");
        return;
      }
      const enabled = await enableBrowserPush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "");
      if (!enabled.ok) { setPushState(enabled.code === "unsupported" ? "unsupported" : enabled.code === "permission_denied" ? "denied" : "failed"); return; }
      const response = await fetch("/api/public/recovery-pass/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, slug: creator.handle, subscription: enabled.subscription.toJSON() }) });
      if (!response.ok) throw new Error("Push notifications could not be saved.");
      setPushState("enabled");
    } catch (reason) { setPushState("failed"); setError(reason instanceof Error ? reason.message : "Push notifications could not be updated."); }
  }

  async function verifyEmail(action: "start" | "verify" | "resend") {
    if (requestPending.current) return false;
    requestPending.current = true;
    setBusy(true); setError(""); setEmailNotice(""); setEmailErrorKind("default");
    let serverMessage = "";
    let serverCode = "";
    try {
      const response = await fetch("/api/public/recovery-pass/email-verification", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action === "verify"
        ? { action, slug: creator.handle, challengeId: emailChallenge, code: emailCode }
        : { action, slug: creator.handle, email, challengeId: action === "resend" ? emailChallenge : undefined, preferenceToken: tokens.preferenceToken, source, landingPath: location.pathname }) });
      const result = await response.json();
      serverMessage = [result.title, result.message].filter((value): value is string => typeof value === "string" && Boolean(value)).join(". ");
      serverCode = typeof result.code === "string" ? result.code : "";
      if (result.kind === "verification_sent") {
        const resendAt = Date.now() + Number(result.resendAfterSeconds ?? 30) * 1_000;
        setEmailChallenge(result.challengeId); setEmailMasked(result.masked); setEmailCode(""); setClock(Date.now()); setEmailResendAt(resendAt);
        sessionStorage.setItem(`audienceown:recovery-email-challenge:${creator.handle}`, JSON.stringify({ challengeId: result.challengeId, email, masked: result.masked, resendAt, expiresAt: Date.now() + 10 * 60_000 } satisfies SavedEmailChallenge));
        if (action === "resend") setEmailNotice("A new code was sent.");
        return true;
      }
      if (result.kind !== "verified") throw new Error(result.message ?? "We couldn't verify that email address.");
      setTokens((value) => ({ ...value, preferenceToken: result.preferenceToken ?? value.preferenceToken, unsubscribeToken: result.unsubscribeToken ?? value.unsubscribeToken }));
      setEmailVerified(true);
      sessionStorage.removeItem(`audienceown:recovery-email-challenge:${creator.handle}`);
      queueMicrotask(() => continueRef.current?.focus());
      return true;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Email verification failed.";
      if (action === "start") setError(serverMessage || "We couldn't send your verification code. Please try again.");
      else {
        setError(message);
        if (serverCode === "expired" || /expired/i.test(message)) setEmailErrorKind("expired");
      }
      return false;
    }
    finally { requestPending.current = false; setBusy(false); }
  }

  async function continueFromEmail() {
    if (emailChallenge) { setError(""); setStage(3); return; }
    if (await verifyEmail("start")) setStage(3);
  }

  async function activate() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/public/recovery-pass/activate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: creator.handle, preferenceToken: tokens.preferenceToken, accountReferences: selected, recoveryAlerts, preferences }) });
      const result = await response.json();
      if (!response.ok || result.status !== "active") throw new Error(result.message ?? "Your Recovery Pass could not be activated.");
      setStage(6);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Activation failed."); }
    finally { setBusy(false); }
  }

  const canContinue = stage === 1 ? selected.length > 0 : stage === 2 ? /.+@.+\..+/.test(email) : stage === 3 ? emailVerified : stage === 4 ? recoveryAlerts : true;
  const title = ["", "Build your connection", "Create your direct connection", "Verify Your Email to Continue", `Choose what ${name} can tell you`, "Protect your connection"];

  if (memberState && !managing) return <MemberManager creator={creator} state={memberState} onManageAccounts={() => { setSelected(memberState.accounts.map((account) => account.reference)); setManaging(true); setStage(1); }} onManagePreferences={() => { setRecoveryAlerts(memberState.recoveryAlerts); setPreferences(RECOVERY_PASS_CATEGORIES.filter((key) => memberState.preferences[key])); setPushState(memberState.deliveryMethods.some((method) => method.type === "web_push") ? "enabled" : browserPushSupport().supported ? "default" : "unsupported"); setManaging(true); setStage(4); }} onManageDelivery={() => { setManaging(true); setStage(2); }} onDisablePush={() => updatePush("disable")} />;

  if (stage === 6 && celebrating) return <StageSixCelebration name={name} creatorHandle={creator.handle} chosen={chosen} />;
  if (stage === 6) return <StageSixJourney name={name} creatorHandle={creator.handle} chosen={chosen} visited={visited} visitedAccountCount={visitedAccountCount} selectedAccountCount={selectedAccountCount} allVisited={allVisited} onVisit={(reference)=>setVisited((value)=>[...new Set([...value,reference])])} onManage={()=>location.reload()} onDone={()=>setCelebrating(true)}/>;

  return <main className="rp-shell"><section className="rp-phone"><header className="rp-header"><AudienceOwnLogo className="rp-logo" size={25} /><span><ShieldCheck size={16} /> Recovery Pass</span></header><div className="rp-step"><span>Step {stage} of 6</span><div>{[1,2,3,4,5,6].map((item) => <i className={item <= stage ? "active" : ""} key={item} />)}</div></div><div className="rp-content"><button className="rp-back" type="button" onClick={() => setStage((value) => Math.max(1, value - 1))} disabled={stage === 1}><ArrowLeft /> Back</button><p className="rp-kicker">Connection continuity first</p><h1>{title[stage]}</h1>
    {stage === 1 && <><p className="rp-lead">Complete your Recovery Pass to stay connected with {name}, even if one of their accounts is hacked, banned, lost, or becomes unavailable.</p><AccountSection label="Main accounts" hint={`Where you already know ${name}`} accounts={main} selected={selected} onToggle={toggleAccount} /><RecoveryAccountSection name={name} accounts={recovery} selected={selected} onToggle={toggleAccount} /></>}
    {stage === 2 && <><p className="rp-lead">Choose how {name} can reach you beyond social platforms.</p><div className="rp-info rp-direct"><span className="rp-info-eyebrow">YOUR DIRECT CONNECTION</span><p className="rp-info-body">This is how {name} can reach you if something happens to an account, tell you what happened, and help you find where to connect with them next.</p></div><EmailCard value={email} onChange={(value) => { setEmail(value); setEmailVerified(false); setEmailChallenge(undefined); setEmailMasked(""); setEmailCode(""); setError(""); sessionStorage.removeItem(`audienceown:recovery-email-challenge:${creator.handle}`); }} name={name} /><p className="rp-privacy"><LockKeyhole /> Your contact details stay protected and are used according to the choices you make here.</p></>}
    {stage === 3 && <><p className="rp-lead rp-verify-lead">We sent a 6-digit verification code to <strong>{emailMasked}</strong>. Enter it below to confirm this Email belongs to you.</p><EmailOtpCard done={emailVerified} busy={busy} code={emailCode} error={error} errorKind={emailErrorKind} notice={emailNotice} name={name} onCode={(value) => { setEmailCode(value); setError(""); setEmailNotice(""); setEmailErrorKind("default"); }} onVerify={() => verifyEmail("verify")} onResend={() => verifyEmail("resend")} resendSeconds={Math.max(0, Math.ceil((emailResendAt - clock) / 1_000))} /></>}
    {stage === 4 && <><label className={`rp-required ${recoveryAlerts ? "selected" : ""}`}><input type="checkbox" checked={recoveryAlerts} required aria-describedby={!recoveryAlerts ? "recovery-alerts-required" : undefined} onChange={(event) => setRecoveryAlerts(event.target.checked)} /><span className="rp-required-icon"><ShieldCheck aria-hidden /></span><span className="rp-required-copy"><span className="rp-recommended"><ShieldCheck aria-hidden /> RECOMMENDED</span><strong className="rp-required-title">Recovery alerts</strong><span className="rp-required-description">Stay connected when it matters most. If one of {name}&apos;s accounts is hacked, banned, impersonated, moved, or becomes unavailable, {name} can tell you what happened and where to find them next.</span><span className="rp-required-note">Required to activate your Recovery Pass</span></span><span className="rp-choice-check" aria-hidden><Check /></span></label>{!recoveryAlerts && <p className="rp-required-helper" id="recovery-alerts-required" role="alert">Recovery alerts are required because they&apos;re what allow {name} to reach you when a platform connection is lost.</p>}<section className="rp-optional" aria-labelledby="optional-updates-heading"><p className="rp-section-eyebrow">Optional updates</p><h2 id="optional-updates-heading">How else would you like to hear from {name}?</h2><p>Choose the updates you&apos;d like to receive. Select as many as you want, or skip them entirely.</p><div className="rp-preferences">{RECOVERY_PASS_CATEGORIES.map((key) => { const item = categoryCopy[key]; const Icon = item.icon; return <label className={preferences.includes(key) ? "selected" : ""} data-category={key} key={key}><input type="checkbox" checked={preferences.includes(key)} onChange={() => togglePreference(key)} /><span className="rp-category-icon"><Icon aria-hidden /></span><span className="rp-preference-copy"><strong>{item.title}</strong><small>{item.description(name)}</small></span><span className="rp-choice-check" aria-hidden><Check /></span></label>; })}</div></section>{preferences.length > 0 && <PushCard name={name} state={pushState} onEnable={() => updatePush("register")} onDisable={() => updatePush("disable")} />}</>}
    {stage === 5 && <Review name={name} chosen={chosen} email={reviewEmail} preferences={preferences} pushEnabled={pushState === "enabled"} />}
    {error && stage !== 3 && <p className={emailErrorKind === "expired" ? "rp-warning" : "rp-error"} role="alert">{error}</p>}</div><footer className="rp-sticky">{stage < 5 ? <button ref={continueRef} type="button" disabled={!canContinue || busy} onClick={stage === 2 ? continueFromEmail : advance}>{stage === 2 && busy ? "Sending verification code…" : "Continue"} {!(stage === 2 && busy) && <ArrowRight />}</button> : <button type="button" disabled={!canContinue || busy || (!memberState && !emailVerified)} onClick={activate}>{busy ? "Protecting your connection…" : memberState ? "Save Recovery Pass" : "Activate my Recovery Pass"} <ShieldCheck /></button>}{stage === 3 && <small className="rp-secure-note"><LockKeyhole aria-hidden /> Your contact details stay protected and are used according to the choices you make here.</small>}{stage === 5 && <><p>One creator. More than one way to stay connected.</p><small>By activating, you agree to receive required recovery alerts and the optional updates you selected. You can manage your choices later.</small></>}</footer></section></main>;
}

type StageSixJourneyProps={name:string;creatorHandle:string;chosen:PublicRecoveryAccount[];visited:string[];visitedAccountCount:number;selectedAccountCount:number;allVisited:boolean;onVisit:(reference:string)=>void;onManage:()=>void;onDone:()=>void};

function StageSixJourney({name,creatorHandle,chosen,visited,visitedAccountCount,selectedAccountCount,allVisited,onVisit,onManage,onDone}:StageSixJourneyProps){
  return <main className="rp-shell"><section className="rp-phone rp-success rp-stage-six"><header className="rp-stage-six-header"><AudienceOwnLogo className="rp-logo" size={25}/><span><ShieldCheck size={16}/> Recovery Pass</span></header><div className="rp-stage-six-body"><div className="rp-stage-six-hero"><div className="rp-celebration" aria-hidden><ShieldCheck size={48}/><i/><i/><i/></div><p className="rp-kicker">Recovery Pass active</p><h1>Your connection to {name} is protected.</h1><p className="rp-lead">Your Recovery Pass is active.</p><div className="rp-info rp-stage-six-guidance"><Sparkles aria-hidden/><p>Social accounts can change, get hacked, banned, or disappear. Following {name} in more than one trusted place gives you another way back if one account is ever lost.</p></div></div><section className="rp-network-completion" aria-labelledby="safety-network-heading"><p className="rp-kicker">Complete your safety network</p><h2 id="safety-network-heading">Follow {name} in every place you chose</h2><p>Open each account below, follow or subscribe there, then come back for the next one. Your Recovery Pass is already active, so you won&apos;t lose your progress.</p><div className={`rp-visit-progress ${allVisited?"is-complete":""}`} role="status"><span>{allVisited&&<CheckCircle2 aria-hidden/>}{allVisited?"All selected accounts visited":`${visitedAccountCount} of ${selectedAccountCount} accounts visited`}</span><i><b style={{width:`${selectedAccountCount?visitedAccountCount/selectedAccountCount*100:0}%`}}/></i></div><div className="rp-stage-six-accounts">{chosen.map(account=>{const wasVisited=visited.includes(account.reference);return <article className="rp-platform-card" data-provider={account.provider.toLowerCase()} key={account.reference}><Brand provider={account.provider}/><div className="rp-platform-copy"><small>{account.provider}</small><strong>{account.handle??account.label}</strong><em>{account.role==="main"?"MAIN ACCOUNT":"RECOVERY ACCOUNT"}</em><span className={wasVisited?"is-visited":""}>{wasVisited&&<CheckCircle2 aria-hidden/>}{wasVisited?"Visited":"Not opened yet"}</span></div><a href={account.profileUrl} target="_blank" rel="noopener noreferrer" aria-label={`${providerAction(account.provider)} (opens in a new tab)`} onClick={()=>onVisit(account.reference)}>{providerAction(account.provider)} <ExternalLink aria-hidden/></a></article>})}</div></section>{allVisited?<section className="rp-completion-guidance is-ready" role="status"><ShieldCheck aria-hidden/><strong>Your safety network is ready.</strong><p>You&apos;ve opened every trusted account you chose. You can review {name}&apos;s verified identity or finish your Recovery Pass.</p></section>:<section className="rp-completion-guidance"><Network aria-hidden/><span className="rp-kicker">Complete your safety network</span><p>Visit every account you chose and follow or subscribe there. Once you&apos;ve opened them all, your final actions will unlock and you&apos;ll be ready to finish.</p><strong>Every connection you add gives you another way back to {name} if one platform is ever lost.</strong></section>}<div className="rp-stage-six-actions"><button className="rp-manage-action" type="button" onClick={onManage}><SlidersHorizontal aria-hidden/> Manage my preferences</button>{allVisited?<a className="rp-identity-action" href={`/verify/${creatorHandle}`} target="_blank" rel="noopener noreferrer"><ShieldCheck aria-hidden/> View {name}&apos;s verified identity <ExternalLink aria-hidden/><span className="sr-only">(opens in a new tab)</span></a>:<button className="rp-identity-action is-locked" type="button" disabled aria-disabled="true"><Lock aria-hidden/> View {name}&apos;s verified identity</button>}<button className="rp-done-action" type="button" disabled={!allVisited} onClick={onDone}>{allVisited?"Done":"Done"} {allVisited?<Check aria-hidden/>:<Lock aria-hidden/>}</button>{!allVisited&&<small className="rp-stage-six-helper"><Lock aria-hidden/> Visit every selected account to unlock your final actions.</small>}</div></div></section></main>;
}

function StageSixCelebration({ name, creatorHandle, chosen }: { name: string; creatorHandle: string; chosen: PublicRecoveryAccount[] }) {
  return <main className="rp-shell"><section className="rp-phone rp-final" aria-live="polite"><AudienceOwnLogo className="rp-logo" size={25} /><div className="rp-orbit" aria-hidden><div className="rp-orbit-shield"><ShieldCheck /></div>{chosen.map((account, index) => <span className="rp-orbit-node" style={{ "--orbit-index": index, "--orbit-count": chosen.length } as React.CSSProperties} key={account.reference}><Brand provider={account.provider} /></span>)}</div><p className="rp-kicker">Recovery Pass complete</p><h1>You&apos;re connected to {name}.</h1><p className="rp-lead">Your Recovery Pass is active, and you&apos;ve visited the trusted accounts you chose—building more than one way to find {name} if a platform account is ever lost, hacked, banned, or unavailable.</p><div className="rp-final-status"><ShieldCheck aria-hidden /><div><strong>Recovery Pass active</strong><p><Check aria-hidden /> Verified Email</p><p><Check aria-hidden /> Recovery alerts protected</p><p><Check aria-hidden /> {chosen.length} trusted account{chosen.length === 1 ? "" : "s"} selected</p></div></div><strong className="rp-all-set">You&apos;re all set.</strong><p className="rp-lead">Your connection to {name} is protected. You can safely close this page whenever you&apos;re ready.</p><div className="rp-final-links"><a href={`/verify/${creatorHandle}`} target="_blank" rel="noopener noreferrer">View {name}&apos;s verified identity <ExternalLink aria-hidden /><span className="sr-only">(opens in a new tab)</span></a><a href={`/c/${creatorHandle}`}>Return to creator page</a></div></section></main>;
}

function MemberManager({ creator, state, onManageAccounts, onManagePreferences, onManageDelivery, onDisablePush }: { creator: CreatorRecord; state: RecoveryPassMemberState; onManageAccounts: () => void; onManagePreferences: () => void; onManageDelivery: () => void; onDisablePush: () => Promise<void> }) {
  const [confirmLeave, setConfirmLeave] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const cancelLeaveRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!confirmLeave) return; cancelLeaveRef.current?.focus(); const close = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirmLeave(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [confirmLeave]);
  async function leave() { setBusy(true); const response = await fetch("/api/public/recovery-pass/manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: creator.handle, action: "leave" }) }); const result = await response.json(); if (result.kind === "membership_left") location.reload(); else { setError(result.message ?? "Recovery Pass could not be left."); setBusy(false); } }
  const emailMethod = state.deliveryMethods.find((method) => method.type === "email");
  const pushEnabled = state.deliveryMethods.some((method) => method.type === "web_push");
  const enabledUpdates = RECOVERY_PASS_CATEGORIES.filter((key) => state.preferences[key]);
  const orderedAccounts = [...state.accounts].sort((left, right) => Number(left.role === "recovery") - Number(right.role === "recovery"));
  return <main className="rp-shell"><section className="rp-phone rp-manager"><header className="rp-header"><AudienceOwnLogo className="rp-logo" size={25} /><span><ShieldCheck size={16} /> Active</span></header><div className="rp-manager-body"><section className="rp-manager-hero"><div><p className="rp-kicker"><ShieldCheck aria-hidden /> Your connection is active</p><h1>Your Recovery Pass with {creator.displayName}</h1><p>Your safety network and verified way to stay connected are shown below.</p></div><div className="rp-manager-shield" aria-hidden><i /><i /><i /><ShieldCheck /></div></section>
    <ManagerCard eyebrow="Your connection" icon={Network}>{orderedAccounts.length ? <div className="rp-manager-rows">{orderedAccounts.map((account) => { const platform = getPlatform(account.provider); return <div className="rp-manager-account" key={account.reference}><Brand provider={account.provider} /><div><small>{account.role === "main" ? "Main account" : "Recovery account"} · {platform?.name ?? account.provider}</small><strong>{account.handle ?? account.label}</strong></div><span className="rp-status-pill"><Check aria-hidden /> Connected</span></div>; })}</div> : <div className="rp-manager-empty"><strong>No connected accounts are available.</strong><p>Manage accounts to restore your safety network.</p></div>}<ManagerAction icon={SlidersHorizontal} onClick={onManageAccounts}>Manage accounts</ManagerAction></ManagerCard>
    <ManagerCard eyebrow="Your protection" icon={ShieldCheck}><div className="rp-manager-feature"><span className="rp-manager-feature-icon is-protection"><ShieldCheck aria-hidden /></span><div><strong>Recovery alerts</strong><p>Get notified if an account in your network is reported at risk.</p></div><span className="rp-status-pill"><Check aria-hidden /> Required</span></div></ManagerCard>
    <ManagerCard eyebrow="Your updates" icon={Megaphone}>{enabledUpdates.length ? <div className="rp-manager-rows">{enabledUpdates.map((key) => { const item = categoryCopy[key]; const Icon = item.icon; return <div className="rp-manager-update" data-category={key} key={key}><span className="rp-manager-feature-icon"><Icon aria-hidden /></span><div><strong>{item.title}</strong><p>{item.description(creator.displayName)}</p></div><span className="rp-status-pill">On</span></div>; })}</div> : <div className="rp-manager-empty"><strong>No optional updates selected</strong><p>Recovery alerts are still active.</p></div>}<ManagerAction icon={BellRing} onClick={onManagePreferences}>Manage notifications</ManagerAction></ManagerCard>
    <ManagerCard eyebrow="Updates delivery" icon={Mail}><div className="rp-manager-rows">{emailMethod ? <div className="rp-manager-feature"><span className="rp-manager-feature-icon is-email"><Mail aria-hidden /></span><div><strong>Email</strong><p>Your Recovery Email is verified and ready.{emailMethod.masked ? ` ${emailMethod.masked}` : ""}</p></div><span className="rp-status-pill"><Check aria-hidden /> Verified</span></div> : <div className="rp-manager-empty"><strong>Verified Email unavailable</strong><p>Change Email to restore verified delivery.</p></div>}{pushEnabled && <div className="rp-manager-feature"><span className="rp-manager-feature-icon is-push"><BellRing aria-hidden /></span><div><strong>Push notifications</strong><p>Instant updates on this device.</p></div><span className="rp-status-pill"><Check aria-hidden /> Enabled</span><button className="rp-inline-action" type="button" disabled={busy} onClick={async () => { setBusy(true); await onDisablePush(); location.reload(); }}>Disable</button></div>}</div><ManagerAction icon={Mail} onClick={onManageDelivery}>Change Email</ManagerAction></ManagerCard>
    <section className="rp-leave-card"><button type="button" onClick={() => setConfirmLeave(true)}><span><LogOut aria-hidden /></span><div><strong>Leave Recovery Pass</strong><p>Remove yourself from {creator.displayName}&apos;s Recovery Pass.</p></div><ChevronRight aria-hidden /></button></section>{error && <p className="rp-error" role="alert">{error}</p>}</div>{confirmLeave && <div className="rp-leave-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmLeave(false); }}><section className="rp-leave-dialog" role="dialog" aria-modal="true" aria-labelledby="leave-pass-title"><span><LogOut aria-hidden /></span><h2 id="leave-pass-title">Leave {creator.displayName}&apos;s Recovery Pass?</h2><p>You&apos;ll stop receiving Recovery alerts and updates from {creator.displayName}. You can join again later.</p><div><button ref={cancelLeaveRef} type="button" onClick={() => setConfirmLeave(false)}>Cancel</button><button type="button" disabled={busy} onClick={leave}>{busy ? "Leaving…" : "Leave Recovery Pass"}</button></div></section></div>}</section></main>;
}

function ManagerCard({ eyebrow, icon: Icon, children }: { eyebrow: string; icon: typeof ShieldCheck; children: React.ReactNode }) { return <section className="rp-manager-card"><h2><Icon aria-hidden /> {eyebrow}</h2>{children}</section>; }
function ManagerAction({ icon: Icon, children, onClick }: { icon: typeof ShieldCheck; children: React.ReactNode; onClick: () => void }) { return <button className="rp-manager-action" type="button" onClick={onClick}><Icon aria-hidden /><span>{children}</span><ChevronRight aria-hidden /></button>; }

function AccountSection({ label, hint, accounts, selected, onToggle }: { label: string; hint: string; accounts: PublicRecoveryAccount[]; selected: string[]; onToggle: (reference: string) => void }) { return <section className="rp-account-section"><div><h2>{label}</h2><p>{hint}</p></div><div className="rp-account-list">{accounts.map((account) => <label className={`rp-account ${selected.includes(account.reference) ? "selected" : ""}`} key={account.reference}><input aria-label={`Select ${getPlatform(account.provider)?.name ?? account.provider} ${account.handle ?? account.label} ${account.role === "main" ? "Main" : "Recovery"} account`} type="checkbox" checked={selected.includes(account.reference)} onChange={() => onToggle(account.reference)} /><Brand provider={account.provider} /><span><small>{account.provider}</small><strong>{account.handle ?? account.label}</strong><em>{account.role === "main" ? "MAIN ACCOUNT" : "RECOVERY ACCOUNT"}</em></span><span className="rp-choice-check" aria-hidden><Check /></span></label>)}</div></section>; }
function RecoveryAccountSection({ name, accounts, selected, onToggle }: { name: string; accounts: PublicRecoveryAccount[]; selected: string[]; onToggle: (reference: string) => void }) { return <section className="rp-account-section rp-recovery-section"><div><h2>Recovery accounts</h2><p>Your safety network</p></div><div className="rp-info"><Sparkles className="rp-info-icon" aria-hidden /><p className="rp-info-body">Don’t let one account be your only way back to {name}. Add trusted Recovery accounts so you can always find {name} if a Main account is ever hacked, banned, lost, or unavailable.</p></div><p className="rp-continuity"><Sparkles aria-hidden size={17} /> <span>The more trusted connections you add, the harder it is to lose touch.</span></p><div className="rp-account-list">{accounts.map((account) => <label className={`rp-account ${selected.includes(account.reference) ? "selected" : ""}`} key={account.reference}><input aria-label={`Select ${getPlatform(account.provider)?.name ?? account.provider} ${account.handle ?? account.label} Recovery account`} type="checkbox" checked={selected.includes(account.reference)} onChange={() => onToggle(account.reference)} /><Brand provider={account.provider} /><span><small>{account.provider}</small><strong>{account.handle ?? account.label}</strong><em>RECOVERY ACCOUNT</em></span><span className="rp-choice-check" aria-hidden><Check /></span></label>)}</div></section>; }
export function EmailCard({ value, onChange, name }: { value: string; onChange: (value: string) => void; name: string }) { return <article className="rp-email-card"><div className="rp-email-card-heading"><span className="rp-email-icon"><Mail aria-hidden /></span><span><strong>Email</strong><small>A reliable way for {name} to reach you beyond social platforms.</small></span></div><label><span>Email address</span><input aria-label="Email address" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={value} onChange={(event) => onChange(event.target.value)} /></label></article>; }
function EmailOtpCard({ done, busy, code, error, errorKind, notice, name, onCode, onVerify, onResend, resendSeconds }: { done: boolean; busy: boolean; code: string; error: string; errorKind: "default" | "expired"; notice: string; name: string; onCode: (value: string) => void; onVerify: () => void; onResend: () => void; resendSeconds: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!done) inputRef.current?.focus(); }, [done]);
  if (done) return <div className="rp-email-verified" role="status" aria-live="polite"><span><CheckCircle2 aria-hidden /></span><div><strong>Email verified</strong><p>Your direct connection to {name} is ready.</p></div></div>;
  const activeIndex = Math.min(code.length, 5);
  const cooldown = `00:${String(resendSeconds).padStart(2, "0")}`;
  return <section className={`rp-otp-panel ${errorKind === "expired" ? "is-expired" : error ? "is-error" : ""}`} aria-labelledby="email-code-label">
    <label className="sr-only" id="email-code-label" htmlFor="email-verification-code">Verification code</label>
    <div className="rp-otp-input-wrap" onClick={() => inputRef.current?.focus()}>
      <input ref={inputRef} id="email-verification-code" aria-describedby="email-code-help" aria-invalid={Boolean(error) || undefined} aria-label="Email verification code" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={6} value={code} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(event) => onCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
      <div className="rp-otp-cells" aria-hidden>{Array.from({ length: 6 }, (_, index) => <span className={`${code[index] ? "is-filled" : ""} ${focused && index === activeIndex ? "is-focused" : ""}`} key={index}>{code[index] ?? ""}</span>)}</div>
    </div>
    <p className="rp-otp-helper" id="email-code-help"><span><ShieldCheck aria-hidden /></span> Enter all six digits from your verification Email.</p>
    {error && <p className={errorKind === "expired" ? "rp-otp-error is-expired" : "rp-otp-error"} role="alert">{error}</p>}
    <button className="rp-verify-email" type="button" disabled={busy || !/^\d{6}$/.test(code)} onClick={onVerify}><ShieldCheck aria-hidden /> {busy ? "Verifying…" : "Verify Email"}</button>
    <div className="rp-resend-card"><span className="rp-resend-icon"><Send aria-hidden /></span><div><strong>Didn&apos;t get the code?</strong><small>{resendSeconds > 0 ? `You can resend in ${cooldown}` : "You can request a new verification email."}</small></div><button type="button" disabled={busy || resendSeconds > 0} onClick={onResend}>{errorKind === "expired" ? "Send a New Verification Email" : "Resend Verification Email"}</button></div>
    {notice && <p className="rp-otp-notice" role="status"><CheckCircle2 aria-hidden /> {notice}</p>}
  </section>;
}
function PushCard({ name, state, onEnable, onDisable }: { name: string; state: "default" | "working" | "enabled" | "denied" | "unsupported" | "failed"; onEnable: () => void; onDisable: () => void }) { return <section className="rp-push" aria-labelledby="push-heading"><span className="rp-push-icon"><BellRing aria-hidden /></span><div><p className="rp-section-eyebrow">Get updates instantly</p><h2 id="push-heading">Push notifications</h2><p>Get the updates you chose as soon as {name} shares them, without waiting for Email.</p><small>Optional. You can turn this off anytime.</small>{state === "denied" && <p className="rp-push-guidance" role="status">Push notifications are blocked in your browser settings. Your Email updates will still work.</p>}{state === "unsupported" && <p className="rp-push-guidance" role="status">Push notifications aren&apos;t supported on this device. Your Email updates will still work.</p>}{state === "failed" && <p className="rp-push-guidance" role="status">Push could not be enabled. Your Email updates will still work.</p>}<button type="button" disabled={state === "working" || state === "denied" || state === "unsupported"} onClick={state === "enabled" ? onDisable : onEnable}>{state === "enabled" ? <><CheckCircle2 /> Enabled · Turn off</> : state === "working" ? "Enabling…" : "Enable push notifications"}</button></div></section>; }
function Review({ name, chosen, email, preferences, pushEnabled }: { name: string; chosen: PublicRecoveryAccount[]; email: string; preferences: RecoveryPassCategory[]; pushEnabled: boolean }) { const group = (role: "main" | "recovery") => chosen.filter((item) => item.role === role); return <><p className="rp-lead">You&apos;re one step away. Review everything once, then protect your connection.</p><div className="rp-review"><ReviewGroup title={`Where you know ${name}`} lines={group("main").map((item) => `${item.provider} · ${item.handle ?? item.label}`)} /><ReviewGroup title="Your recovery network" lines={group("recovery").map((item) => `${item.provider} · ${item.handle ?? item.label}`)} /><ReviewGroup title={`How ${name} can reach you`} lines={[`Email · ${email} · Verified`]} /><ReviewGroup title="Your protection" lines={["Recovery alerts · Required"]} /><ReviewGroup title="Your updates" lines={preferences.map((key) => categoryCopy[key].title)} empty="No optional updates selected" /><ReviewGroup title="Delivery" lines={["Email · Verified", ...(pushEnabled ? ["Push notifications · Enabled"] : [])]} /></div></>; }
function ReviewGroup({ title, lines, empty }: { title: string; lines: string[]; empty?: string }) { if (!lines.length && !empty) return null; return <section><h2>{title}</h2>{lines.length ? lines.map((line) => <p key={line}><Check /> {line}</p>) : <p className="rp-review-empty">{empty}</p>}</section>; }
