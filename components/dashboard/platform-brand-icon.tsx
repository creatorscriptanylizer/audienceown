import { FaDiscord, FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaSnapchat, FaSpotify, FaThreads, FaTiktok, FaTwitch, FaYoutube, FaXTwitter } from "react-icons/fa6";

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: FaYoutube,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  x: FaXTwitter,
  spotify: FaSpotify,
  twitch: FaTwitch,
  linkedin: FaLinkedin,
  facebook: FaFacebook,
  snapchat: FaSnapchat,
  threads: FaThreads,
  pinterest: FaPinterest,
  discord: FaDiscord,
};

const treatments: Record<string, string> = {
  youtube: "bg-red-500/10 text-[#ff0033] shadow-[0_0_24px_rgba(255,0,51,.16)]",
  instagram: "bg-[linear-gradient(145deg,rgba(249,206,52,.17),rgba(238,42,123,.16),rgba(98,40,215,.2))] text-[#f05b8d] shadow-[0_0_24px_rgba(238,42,123,.18)]",
  tiktok: "bg-[#08090d] text-white shadow-[3px_0_0_rgba(254,44,85,.35),-3px_0_0_rgba(37,244,238,.35)]",
  x: "bg-black text-white shadow-[0_0_22px_rgba(255,255,255,.1)]",
  spotify: "bg-green-400/10 text-[#1ed760] shadow-[0_0_24px_rgba(30,215,96,.16)]",
  twitch: "bg-violet-500/10 text-[#a970ff] shadow-[0_0_24px_rgba(145,70,255,.18)]",
  linkedin: "bg-blue-500/10 text-[#0a66c2] shadow-[0_0_24px_rgba(10,102,194,.18)]",
  facebook: "bg-blue-500/10 text-[#1877f2] shadow-[0_0_24px_rgba(24,119,242,.18)]",
  snapchat: "bg-[#fffc00] text-black shadow-[0_0_24px_rgba(255,252,0,.18)]",
  threads: "bg-black text-white shadow-[0_0_22px_rgba(255,255,255,.1)]",
  pinterest: "bg-red-500/10 text-[#e60023] shadow-[0_0_24px_rgba(230,0,35,.16)]",
  discord: "bg-indigo-500/10 text-[#7289da] shadow-[0_0_24px_rgba(88,101,242,.2)]",
};

export function PlatformBrandIcon({ provider, label }: { provider: string; label: string }) {
  const Icon = icons[provider];
  if (!Icon) return null;
  return (
    <span role="img" aria-label={`${label} logo`} className={`platform-brand-icon grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-white/[0.09] ${treatments[provider] ?? "bg-white/5 text-white"}`}>
      <Icon className="text-[21px]" />
    </span>
  );
}
