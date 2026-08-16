"use client";

import { Check, ExternalLink, Link2, LockKeyhole, Sparkles } from "lucide-react";
import type { ProviderConnectionCapability } from "@/lib/social-providers/types";
import type { PlatformDefinition } from "@/lib/platforms";

export type ConnectionMethod = "automatic" | "manual" | null;

export function ProviderConnectionMethodSelector({ platform, capability, value, onChange, roleLabel }: {
  platform: PlatformDefinition; capability?: ProviderConnectionCapability; value: ConnectionMethod;
  onChange: (method: Exclude<ConnectionMethod, null>) => void; roleLabel: string;
}) {
  const Icon = platform.icon;
  const automaticAvailable = capability?.connectable === true;
  const unavailable = capability?.oauthSupported
    ? capability.configurationStatus === "invalid" ? "Automatic connection has a configuration error."
      : "Automatic connection is not configured in this environment."
    : "This provider does not offer an automatic connection here.";
  const unit = capability?.audienceUnit ?? "audience";
  return <fieldset className="connection-method-fieldset">
    <legend>How would you like to connect {platform.name}?</legend>
    <p className="connection-method-intro">Choose the best method for this {roleLabel.toLowerCase()}. You can upgrade a manual account later.</p>
    <div className="connection-method-grid" style={{"--provider-color":platform.brandColor} as React.CSSProperties}>
      <button type="button" className={`connection-method-card automatic ${value === "automatic" ? "is-selected" : ""}`}
        aria-pressed={value === "automatic"} disabled={!automaticAvailable} onClick={() => onChange("automatic")}>
        <span className="method-recommendation"><Sparkles size={11}/> Recommended</span>
        <span className="method-icon"><Icon size={25}/></span>
        <span className="method-copy"><strong>Connect with {platform.name}</strong><small>{automaticAvailable ? `${capability?.reviewStatus === "required" || capability?.reviewStatus === "unknown" ? "App review is still required for production. " : ""}Verify ownership and automatically sync ${unit}.` : unavailable}</small></span>
        {automaticAvailable ? <span className="method-points"><i><Check/>Verified ownership</i><i><Check/>Background synchronization</i><i><LockKeyhole/>Read-only access</i></span> : <span className="method-unavailable">Add manually instead</span>}
      </button>
      <button type="button" className={`connection-method-card manual ${value === "manual" ? "is-selected" : ""}`}
        aria-pressed={value === "manual"} onClick={() => onChange("manual")}>
        <span className="method-fallback">Fallback</span><span className="method-icon"><Link2 size={24}/></span>
        <span className="method-copy"><strong>Add URL or handle</strong><small>No provider login required. Keep this as a recovery destination.</small></span>
        <span className="method-points"><i><Check/>Fast setup</i><i><Check/>Public profile only</i><i><ExternalLink/>Upgrade to API later</i></span>
      </button>
    </div>
  </fieldset>;
}
