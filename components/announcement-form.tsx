"use client";
import { useActionState } from "react";
import { saveAnnouncement } from "@/app/actions/announcement";
import type { FormState } from "@/app/actions/creator";
import { SubmitButton } from "./submit-button";
import type { Creator } from "@/lib/database.helpers";

export function AnnouncementForm({ creator }: { creator?: Creator }) {
  const [state, action] = useActionState<FormState, FormData>(saveAnnouncement, {});
  return <form action={action} className="space-y-4">
    <div><label className="label">Title</label><input name="title" className="input" maxLength={120} defaultValue={creator?.announcement_title ?? ""} required/></div>
    <div><label className="label">Message</label><textarea name="body" className="input min-h-40" maxLength={3000} defaultValue={creator?.announcement_body ?? ""} required/></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="label">Action label (optional)</label><input name="cta_label" className="input" maxLength={40} defaultValue={creator?.announcement_cta_label ?? ""}/></div>
      <div><label className="label">HTTPS action URL (optional)</label><input name="cta_url" className="input" type="url" defaultValue={creator?.announcement_cta_url ?? ""}/></div>
    </div>
    {state.error&&<p role="alert" className="text-sm text-red-300">{state.error}</p>}
    {state.success&&<p role="status" className="text-sm text-emerald-300">{state.success}</p>}
    <SubmitButton className="button button-primary">{creator?.announcement_published_at ? "Update announcement" : "Publish announcement"}</SubmitButton>
  </form>;
}
