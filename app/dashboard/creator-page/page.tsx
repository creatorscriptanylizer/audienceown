import { ImageIcon } from "lucide-react";
import { requireCreator } from "@/lib/dal";
import { CreatorForm } from "@/components/creator-form";
import { AnnouncementForm } from "@/components/announcement-form";
import { SubmitButton } from "@/components/submit-button";
import { removeAnnouncement } from "@/app/actions/announcement";
import { setPublication, uploadCreatorImage } from "@/app/actions/creator";
import { appUrl } from "@/lib/app-url";

export default async function Page() {
  const creator = await requireCreator();
  return <><div className="mb-8"><p className="eyebrow">Your public home</p><h1 className="mt-2 text-3xl font-semibold">Creator page</h1></div>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="surface rounded-xl p-6"><h2 className="mb-6 text-lg font-semibold">Profile</h2><CreatorForm profile={creator} publicSiteUrl={appUrl()}/></section>
      <div className="space-y-6">
        <section className="surface rounded-xl p-4 sm:p-6"><h2 className="text-lg font-semibold">Images</h2><div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">{(["profile","banner"] as const).map(kind=><form key={kind} action={uploadCreatorImage} className="min-w-0 overflow-hidden rounded-xl border p-4"><ImageIcon className="text-zinc-600"/><label className="label mt-3 capitalize">{kind} image</label><input type="hidden" name="kind" value={kind}/><input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className="mt-2 block max-w-full text-xs"/><SubmitButton className="button button-secondary mt-4 w-full justify-center text-xs sm:w-auto">Upload</SubmitButton></form>)}</div></section>
        <section className="surface rounded-xl p-6"><h2 className="mb-5 text-lg font-semibold">Current announcement</h2><AnnouncementForm creator={creator}/>{creator.announcement_published_at&&<form action={removeAnnouncement} className="mt-3"><SubmitButton pendingText="Removing…" className="button button-secondary text-sm text-red-300">Remove announcement</SubmitButton></form>}</section>
        <section className="surface rounded-xl p-6"><h2 className="text-lg font-semibold">Publication</h2><p className="mt-2 text-sm text-zinc-500">Your collision-safe URL is /c/{creator.public_slug}.</p><form action={async(data)=>{"use server";await setPublication({},data)}} className="mt-5"><input type="hidden" name="enabled" value={creator.public_profile_enabled?"false":"true"}/><SubmitButton className="button button-primary">{creator.public_profile_enabled?"Unpublish page":"Publish page"}</SubmitButton></form></section>
      </div>
    </div>
  </>;
}
