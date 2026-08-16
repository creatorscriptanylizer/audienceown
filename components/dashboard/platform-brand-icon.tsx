import { FaDiscord, FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaSnapchat, FaSpotify, FaTiktok, FaTwitch, FaYoutube, FaXTwitter } from "react-icons/fa6";
import { Globe2, Mail, Podcast, Plus } from "lucide-react";

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
  pinterest: FaPinterest,
  discord: FaDiscord,
  website: Globe2,
  podcast: Podcast,
  newsletter: Mail,
  more: Plus,
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
  pinterest: "bg-red-500/10 text-[#e60023] shadow-[0_0_24px_rgba(230,0,35,.16)]",
  discord: "bg-indigo-500/10 text-[#7289da] shadow-[0_0_24px_rgba(88,101,242,.2)]",
  website: "bg-sky-500/10 text-sky-300 shadow-[0_0_24px_rgba(56,189,248,.16)]",
  podcast: "bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_24px_rgba(217,70,239,.16)]",
  newsletter: "bg-emerald-500/10 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,.16)]",
  more: "bg-zinc-500/10 text-zinc-300",
};

export function PlatformBrandIcon({ provider, label, size = "md", animated = false }: { provider: string; label: string; size?: "sm" | "md"; animated?: boolean }) {
  const Icon = icons[provider] ?? Globe2;
  return (
    <span role="img" aria-label={`${label} logo`} className={`platform-brand-icon grid shrink-0 place-items-center border border-white/[0.09] ${size === "sm" ? "h-8 w-8 rounded-[10px]" : "h-11 w-11 rounded-[13px]"} ${animated ? "platform-brand-icon-animated" : ""} ${treatments[provider] ?? "bg-white/5 text-white"}`}>
      {provider === "instagram" && <svg aria-hidden className="absolute size-0"><defs><linearGradient id="instagram-brand-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#f9ce34"/><stop offset=".38" stopColor="#ee2a7b"/><stop offset=".72" stopColor="#8a3ab9"/><stop offset="1" stopColor="#4c68d7"/></linearGradient></defs></svg>}
      <Icon className={`${size === "sm" ? "text-[15px]" : "text-[21px]"} platform-brand-${provider}`} />
    </span>
  );
}
