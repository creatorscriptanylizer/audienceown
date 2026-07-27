import Link from "next/link";
import { ArrowRight, Check, Circle, LifeBuoy, Radio, ShieldAlert, TriangleAlert } from "lucide-react";

export type EmergencyReadiness = {
  recoveryPassEnabled: boolean;
  creatorPageLive: boolean;
  profileCompleted: boolean;
  connectedPlatformCount: number;
  backupPlatformCount: number;
  primaryDestinationLabel: string | null;
};

function ReadinessItem({ label, complete, unavailable = false }: { label: string; complete: boolean; unavailable?: boolean }) {
  return <li className={complete ? "is-complete" : unavailable ? "is-unavailable" : "is-incomplete"}>
    <span>{complete ? <Check size={15}/> : <Circle size={15}/>}</span>
    <strong>{label}</strong>
    <small>{complete ? "Ready" : unavailable ? "Unavailable" : "Not configured"}</small>
  </li>;
}

export function EmergencyWorkspace({ readiness }: { readiness: EmergencyReadiness }) {
  const readyCount = [
    readiness.recoveryPassEnabled,
    readiness.creatorPageLive,
    readiness.profileCompleted,
    readiness.connectedPlatformCount > 0,
    readiness.backupPlatformCount > 0,
  ].filter(Boolean).length;

  return <div className="emergency-page">
    <header className="emergency-header">
      <p className="eyebrow">Recovery control</p>
      <h1>Emergency</h1>
      <p>Prepare and manage the route your audience can use if a platform account is hacked, suspended, deleted, or no longer accessible.</p>
    </header>

    <section className="emergency-readiness">
      <div className="emergency-readiness-copy">
        <span className="emergency-icon"><LifeBuoy size={22}/></span>
        <p className="eyebrow">Recovery readiness</p>
        <h2>{readyCount === 5 ? "Your recovery foundation is ready." : `${readyCount} of 5 safeguards configured.`}</h2>
        <p>These checks use your current creator page, Recovery Pass, and connected-platform settings.</p>
      </div>
      <ul>
        <ReadinessItem label="Recovery Pass enabled" complete={readiness.recoveryPassEnabled}/>
        <ReadinessItem label="Creator page live" complete={readiness.creatorPageLive}/>
        <ReadinessItem label="Primary recovery destination configured" complete={Boolean(readiness.primaryDestinationLabel)}/>
        <ReadinessItem label="Backup platform configured" complete={readiness.backupPlatformCount > 0}/>
        <ReadinessItem label="Recovery contact available" complete={false} unavailable/>
      </ul>
    </section>

    <div className="emergency-grid">
      <section className="emergency-broadcast-panel">
        <span className="emergency-panel-icon"><ShieldAlert size={21}/></span>
        <p className="eyebrow">Emergency broadcast</p>
        <h2>Send an important account update</h2>
        <p>Notify Recovery Pass holders about a hacked account, deleted channel, platform move, or another critical access change.</p>
        <div className="emergency-warning"><TriangleAlert size={16}/><span>Important account updates are reserved for critical access, recovery, and platform migration notices.</span></div>
        <Link href="/dashboard/updates/new?type=account_update" className="button button-primary">Create emergency update <ArrowRight size={15}/></Link>
      </section>

      <section className="emergency-routing-panel">
        <span className="emergency-panel-icon"><Radio size={21}/></span>
        <p className="eyebrow">Recovery routing</p>
        <h2>Current destination</h2>
        {readiness.primaryDestinationLabel
          ? <p className="emergency-destination">{readiness.primaryDestinationLabel}</p>
          : <><p className="emergency-destination is-empty">Not configured</p><p>Recovery routing setup is coming next.</p></>}
        <Link href="/dashboard/platforms" className="button button-secondary">Manage platforms <ArrowRight size={15}/></Link>
      </section>
    </div>

    <section className="emergency-checklist">
      <div><p className="eyebrow">Emergency checklist</p><h2>Foundation checks</h2></div>
      <ul>
        <ReadinessItem label="Creator profile completed" complete={readiness.profileCompleted}/>
        <ReadinessItem label="Public creator page available" complete={readiness.creatorPageLive}/>
        <ReadinessItem label="At least one connected platform" complete={readiness.connectedPlatformCount > 0}/>
        <ReadinessItem label="Recovery Pass configured" complete={readiness.recoveryPassEnabled}/>
        <ReadinessItem label="Backup destination configured" complete={readiness.backupPlatformCount > 0}/>
      </ul>
    </section>
  </div>;
}
