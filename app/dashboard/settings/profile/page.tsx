import { CreatorForm } from "@/components/creator-form";
import { requireCreator } from "@/lib/dal";
import { appUrl } from "@/lib/app-url";
import "../../creator-page/creator-page.css";

export default async function ProfileSettingsPage() {
  const creator = await requireCreator();
  const ready = Boolean(creator.public_profile_enabled && creator.recovery_pass_enabled && creator.public_slug);
  return <><header><p className="eyebrow">Settings</p><h1 className="mt-2 text-3xl font-semibold">Profile</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Manage the canonical identity shown across AudienceOwn and on your public Creator page.</p></header><section className="surface mt-8 rounded-2xl p-6 sm:p-8"><CreatorForm profile={{ recoveryPassName: creator.recovery_pass_name, displayName: creator.display_name, slug: creator.public_slug ?? "", tagline: creator.public_tagline, biography: creator.public_bio }} publicSiteUrl={appUrl()} ready={ready}/></section></>;
}
