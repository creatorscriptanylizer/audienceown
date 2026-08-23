import { ShieldCheck } from "lucide-react";
import { PlatformBrandIcon } from "@/components/dashboard/platform-brand-icon";

const nodes = [
  ["youtube", "YouTube"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["x", "X"],
  ["twitch", "Twitch"], ["discord", "Discord"], ["website", "Website"], ["newsletter", "Newsletter"],
] as const;

export function AuthProtectionVisual() {
  return <div className="auth-protection-visual" aria-label="Multiple creator platforms connected to one AudienceOwn protection layer">
    <svg aria-hidden viewBox="0 0 560 300" className="auth-network-lines">
      <ellipse cx="280" cy="150" rx="224" ry="112" />
      <ellipse cx="280" cy="150" rx="166" ry="82" />
      <path d="M72 88 Q280 264 488 88" />
      <path d="M72 212 Q280 36 488 212" />
      <circle className="auth-network-particle particle-one" cx="0" cy="0" r="2.5" />
      <circle className="auth-network-particle particle-two" cx="0" cy="0" r="2" />
    </svg>
    <div className="auth-shield-core" aria-hidden>
      <ShieldCheck />
      <span>AO</span>
      <small>Protected</small>
    </div>
    {nodes.map(([provider, label], index) => <div className={`auth-platform-node auth-platform-node-${index + 1}`} key={provider}>
      <PlatformBrandIcon provider={provider} label={label} />
    </div>)}
  </div>;
}
