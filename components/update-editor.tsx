"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CalendarClock, Eye, Save, Trash2, XCircle } from "lucide-react";
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
  broadcastTypeLabels,
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

const initialState: UpdateActionState = {};

function FieldError({ state, name }: { state: UpdateActionState; name: string }) {
  const message = state.errors?.[name]?.[0];
  return message ? <p className="update-field-error" id={`${name}-error`}>{message}</p> : null;
}

export function UpdateEditor({ update, initialBroadcastType = "new_content" }: { update?: UpdateEditorValue; initialBroadcastType?: BroadcastType }) {
  const [subjectLength, setSubjectLength] = useState(update?.subject.length ?? 0);
  const [previewLength, setPreviewLength] = useState(update?.preview_text.length ?? 0);
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

  return <div className="update-editor">
    <div className="update-editor-heading">
      <div>
        <p className="eyebrow">{isNew ? "New update" : "Update editor"}</p>
        <h1>{isNew ? "Write something worth opening." : update.title || "Untitled update"}</h1>
        <p>{isNew ? "Start with a draft. You can preview and schedule it when it is ready." : "Shape the message your audience will receive."}</p>
      </div>
      {update && <span className={`update-status status-${update.status}`}>{formatBroadcastStatus(update.status)}</span>}
    </div>

    <form id="update-editor-form" action={saveAction} className="update-editor-form">
      <fieldset disabled={!editable || busy}>
        <div className="update-form-grid">
          <section className="update-form-main">
            <div className="update-field">
              <label htmlFor="broadcast_type">Broadcast type</label>
              <select id="broadcast_type" name="broadcast_type" defaultValue={update?.broadcast_type ?? initialBroadcastType} aria-describedby="broadcast-type-help broadcast_type-error">
                {broadcastTypes.map((type) => <option key={type} value={type}>{broadcastTypeLabels[type]}</option>)}
              </select>
              <p id="broadcast-type-help" className="update-field-help">Choose the audience preference this update belongs to.</p>
              <FieldError state={state} name="broadcast_type"/>
            </div>

            <div className="update-field">
              <label htmlFor="title">Internal title</label>
              <input id="title" name="title" maxLength={120} defaultValue={update?.title ?? ""} placeholder="Weekly studio note"/>
              <p className="update-field-help">Only you see this in update history.</p>
              <FieldError state={state} name="title"/>
            </div>

            <div className="update-field">
              <div className="update-label-row"><label htmlFor="subject">Email subject</label><span>{subjectLength}/160</span></div>
              <input id="subject" name="subject" maxLength={160} defaultValue={update?.subject ?? ""} onChange={(event) => setSubjectLength(event.target.value.length)} placeholder="A quick update from the studio"/>
              <FieldError state={state} name="subject"/>
            </div>

            <div className="update-field">
              <div className="update-label-row"><label htmlFor="preview_text">Preview text</label><span>{previewLength}/200</span></div>
              <input id="preview_text" name="preview_text" maxLength={200} defaultValue={update?.preview_text ?? ""} onChange={(event) => setPreviewLength(event.target.value.length)} placeholder="The line shown beside your subject in the inbox"/>
              <FieldError state={state} name="preview_text"/>
            </div>

            <div className="update-field">
              <label htmlFor="content">Message body</label>
              <textarea id="content" name="content" maxLength={20_000} defaultValue={update?.content ?? ""} placeholder={"Hello,\n\nHere is what I wanted you to know…"}/>
              <FieldError state={state} name="content"/>
            </div>
          </section>

          <aside className="update-form-side">
            <div className="update-side-card">
              <p className="eyebrow">Optional action</p>
              <div className="update-field">
                <label htmlFor="cta_label">Button label</label>
                <input id="cta_label" name="cta_label" maxLength={60} defaultValue={update?.cta_label ?? ""} placeholder="Watch now"/>
                <FieldError state={state} name="cta_label"/>
              </div>
              <div className="update-field">
                <label htmlFor="cta_url">HTTPS button URL</label>
                <input id="cta_url" name="cta_url" type="url" defaultValue={update?.cta_url ?? ""} placeholder="https://"/>
                <FieldError state={state} name="cta_url"/>
              </div>
            </div>

            {!isNew && editable && <div className="update-side-card">
              <p className="eyebrow">Schedule</p>
              <div className="update-field">
                <label htmlFor="scheduled_for">Date and time</label>
                <input id="scheduled_for" name="scheduled_for" type="datetime-local" defaultValue={update.scheduled_for ? update.scheduled_for.slice(0, 16) : ""}/>
                <p className="update-field-help">Uses your device’s local time.</p>
                <FieldError state={scheduleState} name="scheduled_for"/>
              </div>
            </div>}

            <div className="update-type-note">
              <strong>{broadcastTypeLabels[update?.broadcast_type ?? initialBroadcastType]}</strong>
              <p>{broadcastTypeDescriptions[update?.broadcast_type ?? initialBroadcastType]}</p>
            </div>
          </aside>
        </div>
      </fieldset>

      {(state.error || (!editable && !scheduled)) && <p role="alert" className="update-form-error">{state.error || "This update is read-only."}</p>}

      <div className="update-editor-actions">
        <div>
          {update && <Link className="button button-secondary" href={`/dashboard/updates/${update.id}/preview`}><Eye size={16}/> Preview</Link>}
          {update?.status === "draft" && <button
            type="submit"
            formAction={deleteAction}
            className="button update-danger-button"
            disabled={deletePending}
            onClick={(event) => { if (!window.confirm("Delete this draft? This cannot be undone.")) event.preventDefault(); }}
          ><Trash2 size={16}/>{deletePending ? "Deleting…" : "Delete draft"}</button>}
        </div>
        <div>
          {editable && <button type="submit" className="button button-secondary" disabled={busy}><Save size={16}/>{savePending ? "Saving…" : isNew ? "Save draft" : "Save changes"}</button>}
          {!isNew && editable && <button type="submit" formAction={scheduleAction} className="button button-primary" disabled={busy}><CalendarClock size={16}/>{schedulePending ? "Scheduling…" : "Schedule"}</button>}
        </div>
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
