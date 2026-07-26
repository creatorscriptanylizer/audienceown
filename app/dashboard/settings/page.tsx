import Link from "next/link";
import { requireViewer } from "@/lib/dal";
export default async function SettingsPage() {
  const user = await requireViewer();
  return <><div className="mb-8"><p className="eyebrow">Workspace</p><h1 className="mt-2 text-3xl font-semibold">Settings</h1></div><section className="surface rounded-xl p-6"><h2 className="font-semibold">Account</h2><p className="mt-3 text-sm text-zinc-400">{user.email}</p></section><section className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-6"><h2 className="font-semibold text-red-200">Delete account</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Account deletion is intentionally unavailable until the required confirmation-email job and recent-authentication enforcement are configured. Contact support to initiate a verified deletion request.</p><Link href="/contact" className="button button-secondary mt-5 text-sm">Contact support</Link></section></>;
}
