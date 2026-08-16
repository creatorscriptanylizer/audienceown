import type { LucideIcon } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";

const tones = {
  purple: "feature-icon-purple",
  blue: "feature-icon-blue",
  green: "feature-icon-green",
  orange: "feature-icon-orange",
  red: "feature-icon-red",
  pink: "feature-icon-pink",
} as const;

export type FeatureIconTone = keyof typeof tones;

export function FeatureIcon({ icon: Icon, tone = "purple", label, animated = true }: { icon: LucideIcon; tone?: FeatureIconTone; label?: string; animated?: boolean }) {
  return <span role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={`feature-icon ${tones[tone]} ${animated ? "feature-icon-animated" : ""}`}><Icon/></span>;
}

export type PremiumFeatureIconKind = "creator-page"|"communication"|"recovery"|"audience"|"platforms"|"backups"|"hacked"|"suspended"|"broken-link"|"restart"|"lost-access"|"recovery-alert"|"followers-notified"|"found-again"|"video"|"livestream"|"podcast"|"product"|"event"|"announcement"|"community";

function Artwork({kind}:{kind:PremiumFeatureIconKind}){
  if(kind==="platforms")return <span className="premium-platform-cluster"><FaYoutube/><FaInstagram/><FaTiktok/><i/><i/></span>;
  if(kind==="video")return <FaYoutube className="premium-official-logo"/>;
  const common={viewBox:"0 0 48 48",fill:"none","aria-hidden":true} as const;
  if(kind==="creator-page")return <svg {...common}><rect className="fill-a" x="3" y="7" width="42" height="34" rx="6"/><path className="fill-b" d="M3 7h42v10H3z"/><circle className="window-dot" cx="9" cy="12" r="2"/><circle className="window-dot" cx="15" cy="12" r="2"/><path className="stroke-light" d="m14 31 10-8 10 8v8H14v-8Z"/><path className="fill-c verified-badge" d="m36 19 7 3v5c0 5-3 8-7 10-4-2-7-5-7-10v-5l7-3Z"/><path className="stroke-light" d="m33 27 2 2 4-5"/></svg>;
  if(kind==="communication")return <svg {...common}><rect className="fill-a" x="4" y="10" width="40" height="29" rx="6"/><path className="stroke-light" d="m8 15 16 12 16-12"/><path className="fill-b heart-note" d="M19 37 11 29c-4-5 3-9 8-4 5-5 12-1 8 4l-8 8Z"/><circle className="notification-dot communication-dot" cx="40" cy="9" r="6"/></svg>;
  if(kind==="recovery")return <svg {...common}><path className="fill-a" d="M24 4 40 10v12c0 10-6.6 17.2-16 22C14.6 39.2 8 32 8 22V10l16-6Z"/><path className="stroke-light" d="m16.5 24 5 5 10.5-11"/></svg>;
  if(kind==="audience")return <svg {...common}><circle className="fill-a" cx="16" cy="18" r="7"/><circle className="fill-b" cx="34" cy="18" r="7"/><path className="stroke-glow connection-pulse" d="M22 18h6"/><path className="fill-a" d="M4 40c1-8 5-12 12-12s11 4 12 12H4Z"/><path className="fill-b" d="M24 40c1-8 4-12 10-12s9 4 10 12H24Z"/></svg>;
  if(kind==="backups")return <svg {...common}><path className="fill-a" d="M13 34h22a8 8 0 0 0 1-16 13 13 0 0 0-24-2 9 9 0 0 0 1 18Z"/><path className="fill-b" d="m29 20 9 3v7c0 6-4 10-9 13-5-3-9-7-9-13v-7l9-3Z"/><path className="stroke-light upload-pulse" d="M29 35V25m-4 4 4-4 4 4"/></svg>;
  if(kind==="hacked")return <svg {...common}><path className="stroke-main" d="M15 22v-6c0-8 8-12 14-8"/><path className="fill-a" d="M9 21h30v23H9z"/><path className="stroke-light crack" d="m26 25-5 7 5 2-5 7"/></svg>;
  if(kind==="suspended")return <svg {...common}><path className="fill-a" d="M24 4 46 43H2L24 4Z"/><path className="stroke-light warning-pulse" d="M24 17v12m0 7h.1"/></svg>;
  if(kind==="broken-link")return <svg {...common}><path className="stroke-main disconnect-left" d="m19 29-4 4a8 8 0 1 1-11-11l8-8a8 8 0 0 1 11 0"/><path className="stroke-light disconnect-right" d="m29 19 4-4a8 8 0 1 1 11 11l-8 8a8 8 0 0 1-11 0"/><path className="stroke-glow" d="m17 17 14 14"/></svg>;
  if(kind==="restart")return <svg {...common} className="restart-spin"><path className="stroke-main" d="M39 16A18 18 0 1 0 41 29"/><path className="fill-a" d="m31 5 10 2-2 10-8-12Z"/></svg>;
  if(kind==="lost-access")return <svg {...common}><path className="fill-a" d="M24 4 40 10v12c0 10-7 17-16 22C15 39 8 32 8 22V10l16-6Z"/><path className="stroke-light crack" d="m27 11-8 13 7 2-7 13"/></svg>;
  if(kind==="recovery-alert")return <svg {...common}><path className="fill-a bell-ring" d="M9 35h30l-5-7v-8a10 10 0 0 0-20 0v8l-5 7Z"/><path className="fill-b" d="M19 39h10c-1 4-3 5-5 5s-4-1-5-5Z"/><path className="stroke-glow notification-ring" d="M7 18c0-5 2-9 6-12m28 12c0-5-2-9-6-12"/></svg>;
  if(kind==="followers-notified")return <svg {...common}><circle className="fill-a" cx="12" cy="18" r="6"/><circle className="fill-b" cx="24" cy="14" r="7"/><circle className="fill-c" cx="37" cy="19" r="6"/><path className="fill-a" d="M2 41c1-8 4-12 10-12s9 4 10 12H2Zm15 0c1-10 3-15 7-15s7 5 8 15H17Zm13 0c1-8 3-12 7-12s8 4 9 12H30Z"/><circle className="notification-dot" cx="40" cy="9" r="5"/></svg>;
  if(kind==="found-again")return <svg {...common}><path className="fill-a" d="M24 4 41 10v13c0 10-7 17-17 21C14 40 7 33 7 23V10l17-6Z"/><path className="fill-b heartbeat" d="M24 34 13 23c-6-8 5-14 11-7 6-7 17-1 11 7L24 34Z"/></svg>;
  if(kind==="livestream")return <svg {...common}><circle className="fill-a" cx="24" cy="24" r="5"/><path className="stroke-main radio-wave" d="M15 15a13 13 0 0 0 0 18m18-18a13 13 0 0 1 0 18"/><path className="stroke-glow radio-wave-outer" d="M9 9a21 21 0 0 0 0 30m30-30a21 21 0 0 1 0 30"/></svg>;
  if(kind==="podcast")return <svg {...common}><path className="stroke-glow headphone-band" d="M9 24v-4C9 8 16 3 24 3s15 5 15 17v4"/><rect className="fill-b" x="5" y="20" width="8" height="14" rx="4"/><rect className="fill-b" x="35" y="20" width="8" height="14" rx="4"/><rect className="fill-a" x="17" y="8" width="14" height="24" rx="7"/><path className="stroke-main sound-wave" d="M11 27c0 8 5 12 13 12s13-4 13-12M24 39v6m-8 0h16"/><path className="stroke-light" d="M21 15h6m-6 6h6"/></svg>;
  if(kind==="product")return <svg {...common}><path className="fill-a" d="M5 18h38v26H5z"/><path className="fill-b package-lid" d="M3 12h42v10H3z"/><path className="stroke-light" d="M24 12v32"/><path className="stroke-glow" d="M24 12c-11 0-12-10-5-9 5 1 5 9 5 9Zm0 0c11 0 12-10 5-9-5 1-5 9-5 9Z"/><path className="product-sparkle" d="m40 4 1.5 3.5L45 9l-3.5 1.5L40 14l-1.5-3.5L35 9l3.5-1.5L40 4Z"/></svg>;
  if(kind==="event")return <svg {...common}><rect className="fill-a" x="5" y="9" width="38" height="35" rx="5"/><path className="fill-b" d="M5 9h38v11H5z"/><path className="stroke-light" d="M15 4v10m18-10v10"/><path className="calendar-sweep" d="M11 26h26v4H11z"/><circle className="notification-dot event-dot" cx="39" cy="8" r="5"/></svg>;
  if(kind==="announcement")return <svg {...common}><path className="fill-a" d="m5 20 28-12v31L5 29V20Z"/><path className="fill-b" d="m11 30 4 14h9l-6-12"/><path className="stroke-glow notification-ring" d="M38 15c4 4 4 12 0 16"/></svg>;
  return <svg {...common}><path className="fill-a message-float" d="M5 8h38v28H22L12 44v-8H5V8Z"/><path className="fill-b sparkle" d="m36 9 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z"/><path className="community-heart heart-one" d="M17 27c-8-6 0-12 4-6 4-6 12 0 4 6l-4 4-4-4Z"/><path className="community-heart heart-two" d="M28 28c-5-4 0-8 3-4 3-4 8 0 3 4l-3 3-3-3Z"/></svg>;
}

export function PremiumFeatureIcon({kind,label}:{kind:PremiumFeatureIconKind;label?:string}){
  return <span role={label?"img":undefined} aria-label={label} aria-hidden={label?undefined:true} className={`feature-icon premium-feature-icon premium-icon-${kind}`}><Artwork kind={kind}/><i className="icon-sparkle icon-sparkle-a"/><i className="icon-sparkle icon-sparkle-b"/></span>;
}
