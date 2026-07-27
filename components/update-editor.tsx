"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Eye,
  KeyRound,
  Megaphone,
  Radio,
  Save,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import {
  cancelScheduledUpdate,
  createDraft,
  deleteDraft,
  scheduleUpdate,
  updateDraft,
  type UpdateActionState,
} from "@/app/dashboard/updates/actions";
import {
  broadcastTypeDescriptions,
  broadcastTypes,
  formatBroadcastStatus,
  type BroadcastStatus,
  type BroadcastType,
} from "@/lib/updates";

export type UpdateEditorValue = {
  id: string;
  broadcast_type: BroadcastType;
  status: BroadcastStatus;
  title: string;
  subject: string;
  preview_text: string;
  content: string;
  cta_label: string | null;
  cta_url: string | null;
  scheduled_for: string | null;
};

type CreatorIdentity = {
  displayName: string;
  publicSlug: string;
};

const initialState: UpdateActionState = {};
const typeIcons = {
  new_content: Video,
  announcement: Megaphone,
  livestream: Radio,
  event: CalendarClock,
  product_launch: ShoppingBag,
  account_update: KeyRound,
} satisfies Record<BroadcastType, typeof Video>;

const typeShortLabels: Record<BroadcastType, string> = {
  new_content: "New content",
  announcement: "General update",
  livestream: "Live stream",
  event: "Event",
  product_launch: "Product release",
  account_update: "Important account update",
};

function FieldError({ state, name }: { state: UpdateActionState; name: string }) {
  const message = state.errors?.[name]?.[0];
  return message ? <p className="update-field-error" id={`${name}-error`}>{message}</p> : null;
}

export function UpdateEditor({
  update,
  initialBroadcastType = "new_content",
  creatorIdentity,
}: {
  update?: UpdateEditorValue;
  initialBroadcastType?: BroadcastType;
  creatorIdentity: CreatorIdentity;
}) {
  const [subjectLength, setSubjectLength] = useState(update?.subject.length ?? 0);
  const [previewLength, setPreviewLength] = useState(update?.preview_text.length ?? 0);
  const [selectedType, setSelectedType] = useState(update?.broadcast_type ?? initialBroadcastType);
  const [ctaLabel, setCtaLabel] = useState(update?.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(update?.cta_url ?? "");
  const [dirty, setDirty] = useState(false);
  const isNew = !update;
  const editable = isNew || update.status === "draft" || update.status === "cancelled";
  const scheduled = update?.status === "scheduled";
  const save = isNew ? createDraft : updateDraft.bind(null, update.id);
  const [saveState, saveAction, savePending] = useActionState(save, initialState);
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    update ? scheduleUpdate.bind(null, update.id) : createDraft,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    update ? deleteDraft.bind(null, update.id) : createDraft,
    initialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    update ? cancelScheduledUpdate.bind(null, update.id) : createDraft,
    initialState,
  );
  const state = scheduleState.error ? scheduleState : saveState;
  const busy = savePending || schedulePending;
  const isRecovery = selectedType === "account_update";
  const editorStatus = busy
    ? schedulePending ? "Scheduling…" : "Saving…"
    : dirty
      ? "Unsaved changes"
      : update
        ? formatBroadcastStatus(update.status)
        : "Not saved";

  return <div className="update-editor">
    <header className="update-publishing-header">
      <div className="update-publishing-copy">
        <p className="eyebrow">{isNew ? "New update" : "Publishing workspace"}</p>
        <h1>{isNew ? "Craft an update your audience won’t miss." : update.title || "Untitled update"}</h1>
        <p>Write with confidence. AudienceOwn prepares each notification for the relationship your audience chose to protect.</p>
      </div>
      <div className="update-creator-identity" aria-label={`Publishing as ${creatorIdentity.displayName}`}>
        <span>{creatorIdentity.displayName.slice(0, 1).toUpperCase()}</span>
        <div><small>Publishing as</small><strong>{creatorIdentity.displayName}</strong><p>@{creatorIdentity.publicSlug}</p></div>
      </div>
    </header>

    <form
      id="update-editor-form"
      action={saveAction}
      className="update-editor-form"
      onChange={() => setDirty(true)}
    >
      <fieldset disabled={!editable || busy}>
        <div className="update-workspace-grid">
          <section className="update-writing-workspace">
            <section className="update-writing-intro">
              <div>
                <span>01</span>
                <div><p className="eyebrow">The story</p><h2>Shape the message.</h2></div>
              </div>
              <p>Start with the thought that matters. Refine the delivery details after the message feels right.</p>
            </section>

            <div className="update-title-field update-field">
              <label htmlFor="title">Internal title</label>
              <input id="title" name="title" maxLength={120} defaultValue={update?.title ?? ""} placeholder="Give this update a memorable working title…"/>
              <p className="update-field-help">Private to you. Your audience will not see this title.</p>
              <FieldError state={state} name="title"/>
            </div>

            <div className="update-subject-row">
              <div className="update-field">
                <div className="update-label-row"><label htmlFor="subject">Subject</label><span>{subjectLength}/160</span></div>
                <input id="subject" name="subject" maxLength={160} defaultValue={update?.subject ?? ""} onChange={(event) => setSubjectLength(event.target.value.length)} placeholder="A clear reason to open this update…"/>
                <FieldError state={state} name="subject"/>
              </div>
              <div className="update-field">
                <div className="update-label-row"><label htmlFor="preview_text">Preview line</label><span>{previewLength}/200</span></div>
                <input id="preview_text" name="preview_text" maxLength={200} defaultValue={update?.preview_text ?? ""} onChange={(event) => setPreviewLength(event.target.value.length)} placeholder="Add context before they open it…"/>
                <FieldError state={state} name="preview_text"/>
              </div>
            </div>

            <div className="update-message-editor update-field">
              <div className="update-message-editor-top">
                <div><label htmlFor="content">Message</label><p>Write as yourself. Keep the important part unmistakable.</p></div>
                <span><Sparkles size={14}/> Plain text, beautifully delivered</span>
              </div>
              <textarea id="content" name="content" maxLength={20_000} defaultValue={update?.content ?? ""} placeholder={"Tell followers what’s happening…\n\nShare the context they need, what changes, and what comes next."}/>
              <FieldError state={state} name="content"/>
            </div>
          </section>

          <aside className="update-publishing-sidebar">
            <section className="update-sidebar-section update-mode-section">
              <div className="update-sidebar-title"><span>02</span><div><p className="eyebrow">Publishing mode</p><h2>Choose the intent.</h2></div></div>
              <div className="update-type-options" role="radiogroup" aria-label="Broadcast type">
                {broadcastTypes.map((type) => {
                  const Icon = typeIcons[type];
                  return <label key={type} className={`update-type-option ${selectedType === type ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="broadcast_type"
                      value={type}
                      checked={selectedType === type}
                      onChange={() => setSelectedType(type)}
                      aria-describedby="broadcast_type-error"
                    />
                    <span><Icon size={16}/></span>
                    <div><strong>{typeShortLabels[type]}</strong><p>{broadcastTypeDescriptions[type]}</p></div>
                    <CheckCircle2 size={15}/>
                  </label>;
                })}
              </div>
              <FieldError state={state} name="broadcast_type"/>
            </section>

            <section className="update-sidebar-section update-delivery-summary">
              <div className="update-sidebar-heading"><div><p className="eyebrow">Delivery</p><h2>How this reaches people</h2></div><Send size={17}/></div>
              <dl>
                <div><dt>Route</dt><dd>{isRecovery ? "Recovery Pass" : "Email"}</dd></div>
                <div><dt>Behaviour</dt><dd className={isRecovery ? "is-mandatory" : ""}>{isRecovery ? "Mandatory" : "Preference-based"}</dd></div>
                <div><dt>Audience</dt><dd>Resolved when prepared</dd></div>
                <div><dt>Status</dt><dd>{isNew ? "Save draft first" : "Ready to prepare"}</dd></div>
              </dl>
              <p><Users size={14}/>{isRecovery ? "Uses each fan’s exact selected Recovery Pass method." : "Uses the existing audience preference for this update type."}</p>
            </section>

            <section className="update-sidebar-section update-cta-card">
              <div className="update-sidebar-heading"><div><p className="eyebrow">Optional action</p><h2>Give them a next step</h2></div><ArrowUpRight size={17}/></div>
              <div className="update-field">
                <label htmlFor="cta_label">Button label</label>
                <input id="cta_label" name="cta_label" maxLength={60} value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="View the update"/>
                <FieldError state={state} name="cta_label"/>
              </div>
              <div className="update-field">
                <label htmlFor="cta_url">Destination URL</label>
                <input id="cta_url" name="cta_url" type="url" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} placeholder="https://"/>
                <FieldError state={state} name="cta_url"/>
              </div>
              <div className="update-cta-preview">
                <small>Button preview</small>
                <span>{ctaLabel || "Your button label"}<ArrowUpRight size={13}/></span>
                <p>{ctaUrl || "Add a secure HTTPS destination"}</p>
              </div>
            </section>

            {!isNew && editable && <section className="update-sidebar-section update-schedule-card">
              <div className="update-sidebar-heading"><div><p className="eyebrow">Timing</p><h2>Schedule delivery</h2></div><CalendarClock size={17}/></div>
              <div className="update-field">
                <label htmlFor="scheduled_for">Date and time</label>
                <input id="scheduled_for" name="scheduled_for" type="datetime-local" defaultValue={update.scheduled_for ? update.scheduled_for.slice(0, 16) : ""}/>
                <p className="update-field-help">Uses your device’s local time.</p>
                <FieldError state={scheduleState} name="scheduled_for"/>
              </div>
            </section>}
          </aside>
        </div>
      </fieldset>

      {(state.error || (!editable && !scheduled)) && <p role="alert" className="update-form-error">{state.error || "This update is read-only."}</p>}

      <div className="update-publish-toolbar">
        <div className="update-live-status" aria-live="polite">
          <span className={dirty ? "is-dirty" : ""}/>
          <div><small>{update ? "Update status" : "Draft status"}</small><strong>{editorStatus}</strong></div>
        </div>
        <div className="update-toolbar-actions">
          {update?.status === "draft" && <button
            type="submit"
            formAction={deleteAction}
            className="button update-danger-button"
            disabled={deletePending}
            onClick={(event) => { if (!window.confirm("Delete this draft? This cannot be undone.")) event.preventDefault(); }}
          ><Trash2 size={16}/>{deletePending ? "Deleting…" : "Delete"}</button>}
          {update
            ? <Link className="button button-secondary" href={`/dashboard/updates/${update.id}/preview`}><Eye size={16}/> Preview</Link>
            : <button type="button" className="button button-secondary" disabled title="Save this draft before previewing"><Eye size={16}/> Preview</button>}
          {editable && <button type="submit" className="button button-secondary" disabled={busy}><Save size={16}/>{savePending ? "Saving…" : "Save draft"}</button>}
          {!isNew && editable && <button type="submit" formAction={scheduleAction} className="button button-primary update-publish-button" disabled={busy}><CalendarClock size={16}/>{schedulePending ? "Scheduling…" : "Schedule update"}</button>}
        </div>
        {isNew && <p className="update-toolbar-note">Save the draft to unlock preview and scheduling.</p>}
      </div>
    </form>

    {deleteState.error && <p role="alert" className="update-form-error">{deleteState.error}</p>}
    {scheduled && <form action={cancelAction} className="update-cancel-form">
      {cancelState.error && <p role="alert" className="update-form-error">{cancelState.error}</p>}
      <button className="button update-danger-button" disabled={cancelPending} onClick={(event) => { if (!window.confirm("Cancel this scheduled update?")) event.preventDefault(); }}>
        <XCircle size={16}/>{cancelPending ? "Cancelling…" : "Cancel schedule"}
      </button>
    </form>}
  </div>;
}
