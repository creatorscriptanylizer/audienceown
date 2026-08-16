"use client";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { checkHandle, createCreator, updateCreator, type FormState } from "@/app/actions/creator";
import { SubmitButton } from "./submit-button";
import type { Creator } from "@/lib/database.helpers";
import {
  applyManualSlugEdit,
  canSubmitCreatorForm,
  localSlugAvailability,
  syncSlugWithDisplayName,
  type SlugAvailability,
} from "@/lib/creator-profile";

export function CreatorForm({ profile, publicSiteUrl }: { profile?: Creator | null; publicSiteUrl: string }) {
  const action = profile ? updateCreator : createCreator;
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [slugState, setSlugState] = useState({
    slug: profile?.public_slug ?? "",
    manuallyEdited: Boolean(profile),
  });
  const [bio, setBio] = useState(profile?.public_bio ?? "");
  const [remoteAvailability, setRemoteAvailability] = useState<{
    slug: string;
    availability: SlugAvailability;
  } | null>(null);
  const urlPrefix = `${new URL(publicSiteUrl).host}/c/`;
  const localAvailability = localSlugAvailability(slugState.slug, profile?.public_slug);
  const availability = localAvailability.status === "checking"
    && remoteAvailability?.slug === slugState.slug
    ? remoteAvailability.availability
    : localAvailability;

  useEffect(() => {
    const localState = localSlugAvailability(slugState.slug, profile?.public_slug);
    if (localState.status !== "checking") return;

    let active = true;
    const timer = setTimeout(async () => {
      const checkedSlug = slugState.slug;
      const result = await checkHandle(checkedSlug).catch(() => ({
        available: false as const,
        reason: "invalid" as const,
        message: "Availability could not be checked",
      }));
      if (!active) return;
      setRemoteAvailability({
        slug: checkedSlug,
        availability: result.available ? { status: "available" } : {
          status: result.reason === "taken" ? "taken" : "invalid",
          message: result.message,
        },
      });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [slugState.slug, profile?.public_slug]);

  const availabilityMessage = availability.status === "checking" ? "Checking availability…"
    : availability.status === "available" ? "Available"
    : availability.status === "taken" ? "Already taken"
    : availability.status === "invalid" ? "Invalid URL"
    : null;
  const descriptionId = availability.status === "idle" || availability.status === "unchanged"
    ? undefined
    : "public_slug_status";
  const dirty = Boolean(profile) && (displayName !== profile?.display_name || slugState.slug !== profile?.public_slug || bio !== (profile?.public_bio ?? ""));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return <form action={formAction} className="space-y-6">
    <div><label className="label" htmlFor="display_name">Display name</label><input className="input" id="display_name" name="display_name" maxLength={80} value={displayName} onChange={(event) => {
      const nextDisplayName = event.target.value;
      setDisplayName(nextDisplayName);
      setSlugState((current) => syncSlugWithDisplayName(current, nextDisplayName));
    }} required/></div>
    <div>
      <label className="label" htmlFor="public_slug">Your permanent URL</label>
      <div className="flex flex-col overflow-hidden rounded-[.65rem] border bg-[#0c0c0f] focus-within:border-violet-500 focus-within:ring-3 focus-within:ring-violet-500/10 sm:flex-row sm:items-center">
        <span className="shrink-0 border-b px-3 pt-2.5 pb-1 text-xs text-zinc-500 sm:border-r sm:border-b-0 sm:py-3 sm:text-sm">{urlPrefix}</span>
        <input className="min-w-0 flex-1 bg-transparent px-3 pt-1 pb-2.5 outline-none sm:p-3" id="public_slug" name="public_slug" value={slugState.slug} onChange={(event) => setSlugState(applyManualSlugEdit(event.target.value, displayName))} maxLength={40} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" aria-invalid={availability.status === "invalid" || availability.status === "taken"} aria-describedby={descriptionId} required/>
      </div>
      {availabilityMessage && <p id="public_slug_status" role={availability.status === "invalid" || availability.status === "taken" ? "alert" : "status"} aria-live="polite" className={`mt-2 flex items-center gap-1.5 text-xs ${availability.status === "available" ? "text-emerald-400" : availability.status === "checking" ? "text-zinc-400" : "text-amber-300"}`}>
        {availability.status === "checking" ? <LoaderCircle className="animate-spin" size={13}/> : availability.status === "available" ? <CheckCircle2 size={13}/> : <CircleAlert size={13}/>}
        {availabilityMessage}{availability.status === "invalid" && "message" in availability ? ` — ${availability.message}` : ""}
      </p>}
      {availability.status === "available" && <p className="mt-1.5 text-xs text-zinc-500">This URL will be reserved for your account.</p>}
    </div>
    <div><label className="label" htmlFor="public_bio">Biography <span className="font-normal text-zinc-500">(optional)</span></label><textarea className="input min-h-32 resize-y" id="public_bio" name="public_bio" maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)}/><p className="mt-1.5 text-xs text-zinc-500" aria-live="polite">{bio.length} / 500</p></div>
    {dirty&&<p role="status" className="text-xs text-amber-200">You have unsaved profile changes.</p>}{state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}{state.success && <p role="status" className="text-sm text-emerald-300">{state.success}</p>}
    <SubmitButton className="button button-primary" pendingText="Saving…" disabled={!canSubmitCreatorForm(availability)}>{profile ? "Save changes" : "Claim my page"}</SubmitButton>
  </form>;
}
