"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, Eye, Link2, Megaphone,
  Save, Send, ShieldCheck, Users,
} from "lucide-react";
import { createDraft, publishUpdate, scheduleUpdate, updateDraft, type UpdateActionState } from "@/app/dashboard/updates/actions";
import { getIntentDefinition, type BroadcastIntent } from "@/lib/broadcast-studio";
import { formatScheduledDate } from "@/lib/scheduling";
import type { BroadcastType } from "@/lib/updates";
import { FocusedEditor } from "./focused-editor";
import { broadcastChoices, emergencySubtypes, isAccountEmergency } from "./broadcast-choices";
import type { AudienceEstimate, BroadcastValue, PlatformAccount } from "./types";

const initialState: UpdateActionState = {};
function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function BroadcastStudio({ update, initialBroadcastType: _initialBroadcastType = "new_content", creator, accounts, estimate }: {
  update?: BroadcastValue; initialBroadcastType?: BroadcastType;
  creator: { displayName: string; publicSlug: string };
  accounts: PlatformAccount[]; estimate: AudienceEstimate | null;
}) {
  void _initialBroadcastType;
  const [intent, setIntent] = useState<BroadcastIntent>(update?.broadcast_intent ?? "account_hacked");
  const [formOpen, setFormOpen] = useState(Boolean(update));
  const [platformId, setPlatformId] = useState(update?.affected_platform_connection_id ?? "");
  const [title, setTitle] = useState(update?.title ?? "");
  const [subject, setSubject] = useState(update?.subject ?? "");
  const [previewText, setPreviewText] = useState(update?.preview_text ?? "");
  const [body, setBody] = useState(update?.content ?? "");
  const [ctaLabel, setCtaLabel] = useState(update?.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(update?.cta_url ?? "");
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"publish" | "schedule">("publish");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const definition = getIntentDefinition(intent);
  const saveFn = update ? updateDraft.bind(null, update.id) : createDraft;
  const publishFn = update ? publishUpdate.bind(null, update.id) : createDraft;
  const scheduleFn = update ? scheduleUpdate.bind(null, update.id) : createDraft;
  const [saveState, saveAction, savePending] = useActionState(saveFn, initialState);
  const [publishState, publishAction, publishPending] = useActionState(publishFn, initialState);
  const [scheduleState, scheduleAction, schedulePending] = useActionState(scheduleFn, initialState);
  const state = scheduleState.error ? scheduleState : publishState.error ? publishState : saveState;
  const committing = publishPending || schedulePending;
  const scheduledIso = scheduledLocal && !Number.isNaN(new Date(scheduledLocal).getTime())
    ? new Date(scheduledLocal).toISOString()
    : "";
  const officialAccounts = accounts.filter((account) => account.account_type === "official");
  const selected = accounts.find((account) => account.id === platformId);
  const backup = selected && accounts.find((account) => account.account_type === "backup" && account.platform === selected.platform);
  const isEmergencyFamily = isAccountEmergency(intent);
  const audience = selected ? `Followers connected through ${titleCase(selected.platform)}` : `Followers subscribed to ${definition.category}`;
  const realEstimate = update && !dirty ? estimate : null;
  const complete = Boolean(title.trim() && subject.trim() && body.trim() && (definition.platform !== "required" || platformId));
  const publishDisabled = !update || dirty || !complete || !realEstimate || realEstimate.eligible === 0;
  const disabledReason = !update ? "Save this draft before publishing"
    : dirty ? "Save changes to recalculate the audience"
      : !complete ? "Complete the required fields"
        : !realEstimate ? "Audience unavailable"
          : realEstimate.eligible === 0 ? "No eligible followers" : "";

  function change(callback: () => void) { callback(); setDirty(true); }
  function openChoice(next: BroadcastIntent, button: HTMLButtonElement) {
    openerRef.current = button;
    setIntent(next);
    if (getIntentDefinition(next).platform === "none") setPlatformId("");
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  return <div className="broadcast-studio broadcast-choice-studio">
    <main className="broadcast-choice-page" inert={formOpen || confirmOpen ? true : undefined}>
      <header className="broadcast-choice-header">
        <div><p className="eyebrow">Create an update</p><h1>What do you need to tell your audience?</h1><p>Choose a broadcast type. AudienceOwn will guide you through the correct audience, message, and delivery process.</p></div>
        <div className="studio-identity"><span>{creator.displayName.slice(0, 1).toUpperCase()}</span><div><small>Publishing as</small><strong>{creator.displayName}</strong><p>@{creator.publicSlug}</p></div></div>
      </header>
      {(["protect", "share"] as const).map((group) => <section className={`broadcast-choice-group is-${group}`} key={group} aria-labelledby={`${group}-heading`}>
        <div className="broadcast-choice-heading"><span>{group === "protect" ? <ShieldCheck/> : <Megaphone/>}</span><div><h2 id={`${group}-heading`}>{group === "protect" ? "Protect your audience" : "Share something new"}</h2><p>{group === "protect" ? "Reach the right followers when a platform account fails." : "Share releases, moments, and news with interested followers."}</p></div></div>
        <div className="broadcast-choice-grid">
          {broadcastChoices.filter((choice) => choice.group === group).map((choice) => {
            const Icon = choice.icon;
            const isDraft = update && (choice.intent === intent || choice.intent === "account_hacked" && isEmergencyFamily);
            return <button key={choice.intent} type="button" className={`broadcast-choice-card tone-${choice.tone}`} onClick={(event) => openChoice(choice.intent, event.currentTarget)}>
              <span className="broadcast-choice-icon"><Icon/></span>
              {isDraft && <span className="broadcast-draft-badge"><CheckCircle2/> Continue draft</span>}
              <span className="broadcast-choice-copy"><strong>{choice.title}</strong><small>{choice.description}</small></span>
              <span className="broadcast-choice-delivery">{choice.delivery}</span>
              <span className="broadcast-choice-start">Start <ArrowUpRight/></span>
            </button>;
          })}
        </div>
      </section>)}
    </main>

    <form id="broadcast-form" action={saveAction}>
      <input type="hidden" name="broadcast_intent" value={intent}/><input type="hidden" name="affected_platform_connection_id" value={platformId}/>
      <input type="hidden" name="title" value={title}/><input type="hidden" name="subject" value={subject}/><input type="hidden" name="preview_text" value={previewText}/>
      <input type="hidden" name="content" value={body}/><input type="hidden" name="cta_label" value={ctaLabel}/><input type="hidden" name="cta_url" value={ctaUrl}/>
      <input type="hidden" name="scheduled_for_iso" value={scheduledIso}/><input type="hidden" name="time_zone" value={timeZone}/>

      {formOpen && !confirmOpen && <FocusedEditor step="Create update" title={isEmergencyFamily ? "Account inaccessible" : definition.title} description={definition.description} onClose={closeForm} onContinue={() => {}} footer={<>
        <button type="button" className="button button-secondary" onClick={closeForm}>Cancel</button>
        <button type="submit" className={`button ${update ? "button-secondary" : "button-primary"}`} disabled={savePending || publishPending}><Save/>{savePending ? "Saving…" : "Save draft"}</button>
        {update && <button type="button" className="button button-primary" disabled={publishDisabled} title={disabledReason} onClick={() => setConfirmOpen(true)}><Eye/>Review and send</button>}
      </>}>
        <div className="broadcast-form-stack">
          {isEmergencyFamily && <section className="broadcast-form-section"><div className="broadcast-form-section-title"><span>01</span><div><h3>What happened to the account?</h3><p>This determines the guidance shown to you. Recovery routing remains mandatory.</p></div></div>
            <label className="broadcast-select-field"><span>Situation</span><select value={intent} onChange={(event) => change(() => setIntent(event.target.value as BroadcastIntent))}>{emergencySubtypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><small>{emergencySubtypes.find((item) => item.value === intent)?.description}</small></label>
          </section>}

          {definition.platform !== "none" && <section className="broadcast-form-section"><div className="broadcast-form-section-title"><span>{isEmergencyFamily ? "02" : "01"}</span><div><h3>{definition.mandatory ? "Which account is affected?" : "Choose a platform"}</h3><p>{definition.mandatory ? "Only followers associated with this account will qualify." : "You may narrow this update to followers from one connected platform."}</p></div></div>
            <div className="broadcast-platform-options">
              {definition.platform === "optional" && <button type="button" className={!platformId ? "is-selected" : ""} onClick={() => change(() => setPlatformId(""))}><Users/><span><strong>All matching subscribers</strong><small>Do not narrow by platform</small></span></button>}
              {officialAccounts.map((account) => <button type="button" key={account.id} className={platformId === account.id ? "is-selected" : ""} onClick={() => change(() => setPlatformId(account.id))}><span className="studio-platform-logo">{account.platform.slice(0, 1).toUpperCase()}</span><span><strong>{titleCase(account.platform)} · {account.label}</strong><small>{account.is_primary ? "Primary connected account" : "Connected official account"}</small></span>{platformId === account.id && <CheckCircle2/>}</button>)}
            </div>
            {!officialAccounts.length && <div className="studio-focus-note is-warning"><AlertTriangle/><div><strong>No official accounts connected</strong><p>Configure a platform before continuing.</p><Link href="/dashboard/platforms">Configure platforms</Link></div></div>}
          </section>}

          {definition.mandatory && <section className="broadcast-form-section"><div className="broadcast-form-section-title"><span>{isEmergencyFamily ? "03" : "02"}</span><div><h3>Where should followers find you?</h3><p>Show a verified alternative without inventing a destination.</p></div></div>
            <div className="broadcast-destination-summary">{backup ? <><CheckCircle2/><div><small>Connected backup destination</small><strong>{backup.label}</strong><p>{backup.url}</p></div></> : <><AlertTriangle/><div><small>Backup destination</small><strong>Not configured</strong><p>You can still send a truthful alert using your public recovery page.</p></div></>}</div>
            <div className="studio-public-fallback"><ShieldCheck/><div><small>AudienceOwn public page</small><strong>/c/{creator.publicSlug}</strong></div></div>
          </section>}

          <section className="broadcast-form-section"><div className="broadcast-form-section-title"><span>{definition.mandatory ? isEmergencyFamily ? "04" : "03" : definition.platform !== "none" ? "02" : "01"}</span><div><h3>Write what followers need to know</h3><p>{definition.placeholder}</p></div></div>
            {definition.mandatory && <div className="studio-writing-guide"><AlertTriangle/><div><strong>A strong recovery alert includes</strong><p>What happened · what followers should avoid · where to find you · what happens next</p></div></div>}
            <div className="broadcast-message-fields">
              <label><span>{["new_video", "livestream", "podcast_episode", "product_release", "event"].includes(intent) ? `${definition.title} title` : "Internal title"} <small>{title.length}/120</small></span><input value={title} maxLength={120} onChange={(event) => change(() => setTitle(event.target.value))} placeholder="Give this update a clear title"/></label>
              <label className="is-prominent"><span>Subject <small>{subject.length}/160</small></span><input value={subject} maxLength={160} onChange={(event) => change(() => setSubject(event.target.value))} placeholder="A clear reason to open this update"/></label>
              <label><span>Preview text <small>{previewText.length}/200</small></span><input value={previewText} maxLength={200} onChange={(event) => change(() => setPreviewText(event.target.value))} placeholder="Add context before they open it"/></label>
              <label><span>Message <small>{body.length.toLocaleString()}/20,000</small></span><textarea value={body} maxLength={20000} onChange={(event) => change(() => setBody(event.target.value))} placeholder={definition.placeholder}/></label>
            </div>
          </section>

          <section className="broadcast-form-section"><div className="broadcast-form-section-title"><span>{definition.mandatory ? isEmergencyFamily ? "05" : "04" : definition.platform !== "none" ? "03" : "02"}</span><div><h3>{definition.mandatory ? "Optional action" : `${definition.title} link`}</h3><p>Give followers a secure next step. HTTPS destinations only.</p></div></div>
            <div className="studio-action-fields"><label><span>Button label</span><input value={ctaLabel} maxLength={60} onChange={(event) => change(() => setCtaLabel(event.target.value))} placeholder={definition.mandatory ? "Find my verified account" : `View ${definition.title.toLowerCase()}`}/></label><label><span>HTTPS destination</span><input type="url" value={ctaUrl} onChange={(event) => change(() => setCtaUrl(event.target.value))} placeholder="https://"/></label></div>
            {backup?.url && <button type="button" className="broadcast-use-destination" onClick={() => change(() => { setCtaUrl(backup.url); if (!ctaLabel) setCtaLabel("Find my verified account"); })}><Link2/> Use {backup.label}</button>}
            {state.errors?.cta_url?.[0] && <p className="update-field-error">{state.errors.cta_url[0]}</p>}
          </section>

          <section className="broadcast-form-section broadcast-audience-summary"><div className="broadcast-form-section-title"><span>{definition.mandatory ? isEmergencyFamily ? "06" : "05" : definition.platform !== "none" ? "04" : "03"}</span><div><h3>Who will receive this?</h3><p>AudienceOwn uses the same real rules when calculating and preparing delivery.</p></div></div>
            <dl className="studio-review-list"><div><dt>Audience</dt><dd>{audience}</dd></div><div><dt>Delivery</dt><dd>{definition.mandatory ? "Mandatory Recovery Pass" : "Preference-based email"}</dd></div><div><dt>How it reaches followers</dt><dd>{definition.mandatory ? "The exact recovery method each follower chose" : "Verified email only"}</dd></div><div><dt>Eligible followers</dt><dd>{realEstimate ? realEstimate.eligible.toLocaleString() : update && dirty ? "Save to recalculate" : "Save draft to calculate"}</dd></div></dl>
            {realEstimate && <p className="broadcast-real-count"><Users/>{realEstimate.eligible.toLocaleString()} eligible followers</p>}
          </section>
          {state.error && <p role="alert" className="update-form-error">{state.error}</p>}
        </div>
      </FocusedEditor>}

      {confirmOpen && <FocusedEditor step="Review and send" title={definition.mandatory ? "Send recovery alert?" : definition.action} description="Check the real audience and choose when this update becomes eligible for delivery." onClose={() => setConfirmOpen(false)} closeDisabled={committing} onContinue={() => {}} footer={<><button type="button" className="button button-secondary" disabled={committing} onClick={() => setConfirmOpen(false)}>Back</button>{deliveryMode === "publish" ? <button type="submit" formAction={publishAction} className="button button-primary" disabled={committing}><Send/>{publishPending ? "Publishing…" : "Publish now"}</button> : <button type="submit" formAction={scheduleAction} className="button button-primary" disabled={committing || !scheduledIso}><CalendarClock/>{schedulePending ? "Scheduling…" : "Schedule update"}</button>}</>}>
        <div className="broadcast-confirmation"><dl className="studio-review-list"><div><dt>Update</dt><dd>{definition.title}</dd></div>{definition.platform !== "none" && <div><dt>Affected account</dt><dd>{selected ? `${titleCase(selected.platform)} · ${selected.label}` : "Not selected"}</dd></div>}<div><dt>Audience</dt><dd>{realEstimate?.eligible.toLocaleString()} eligible followers</dd></div><div><dt>Delivery</dt><dd>{definition.mandatory ? "Mandatory Recovery Pass" : "Preference-based email"}</dd></div><div><dt>Route</dt><dd>{definition.mandatory ? "Each follower’s exact selected Recovery Pass" : "Verified email only"}</dd></div>{definition.mandatory && <div><dt>Backup destination</dt><dd>{backup?.label || "Not configured"}</dd></div>}</dl>
          <div className="studio-publish-mode" role="group" aria-label="Delivery time">
            <button type="button" className={deliveryMode === "publish" ? "is-selected" : ""} disabled={committing} onClick={() => setDeliveryMode("publish")}><Send/><span><strong>Publish now</strong><small>Queue delivery immediately</small></span></button>
            <button type="button" className={deliveryMode === "schedule" ? "is-selected" : ""} disabled={committing} onClick={() => setDeliveryMode("schedule")}><CalendarClock/><span><strong>Schedule</strong><small>Choose a future local time</small></span></button>
          </div>
          {deliveryMode === "schedule" && <section className="studio-schedule-fields">
            <label><span>Date and time</span><input name="scheduled_for_local" type="datetime-local" value={scheduledLocal} onChange={(event) => setScheduledLocal(event.target.value)}/></label>
            <div><small>Time zone</small><strong>{timeZone}</strong></div>
            {scheduledIso && <p>This update will become eligible on <strong>{formatScheduledDate(scheduledIso, timeZone)}</strong>.</p>}
            {scheduleState.errors?.scheduled_for_local?.[0] && <p className="update-field-error">{scheduleState.errors.scheduled_for_local[0]}</p>}
          </section>}
          <p className="studio-focus-note">{definition.mandatory ? "Each eligible follower will receive this alert through their exact selected Recovery Pass." : "Eligible followers will receive this through verified email according to their category preferences."}</p>
          <article className="studio-email-preview"><p className="eyebrow">Message preview</p><h3>{subject}</h3><p>{previewText || "No preview text"}</p><div>{body}</div>{ctaLabel && ctaUrl && <span>{ctaLabel}</span>}<footer>{definition.mandatory ? "Mandatory Recovery Alert" : "Preference-based Update"} · Delivered by AudienceOwn</footer></article>
        </div>
      </FocusedEditor>}
    </form>
  </div>;
}
