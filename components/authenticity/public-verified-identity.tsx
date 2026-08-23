import Image from "next/image";
import { ArrowRight, BadgeCheck, CircleAlert, ExternalLink, ShieldCheck } from "lucide-react";
import { AudienceOwnLogo } from "@/components/logo";
import { PlatformBrandIcon } from "@/components/dashboard/platform-brand-icon";
import type { PublicRecoveryNetwork, PublicVerifiedAccount, PublicVerifiedIdentity } from "@/lib/public-verified-identity";
import styles from "./public-verified-identity.module.css";

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const providerName = (provider: string) => provider === "x" ? "X" : provider.charAt(0).toUpperCase() + provider.slice(1);
const verificationLabel = (status: PublicVerifiedAccount["verificationStatus"]) => ({ verified: "Verified", pending: "Verification pending", needs_attention: "Needs attention", not_verified: "Not verified" })[status];
const connectionLabel = (status: PublicVerifiedAccount["connectionStatus"]) => ({ connected: "Connected", needs_attention: "Connection needs attention", not_connected: "Not connected" })[status];

function Account({ account, role }: { account: PublicVerifiedAccount; role: "main" | "recovery" }) {
  const content = <>
    <PlatformBrandIcon provider={account.provider} label={providerName(account.provider)} />
    <span><small>{providerName(account.provider)}</small><strong>{account.displayName}</strong><b>{role === "main" ? "Main account" : "Recovery account"}</b><span className={styles.statusChips}><span data-status-kind="verification" className={`${styles.chip} ${styles[`verification_${account.verificationStatus}`]}`}>{verificationLabel(account.verificationStatus)}</span><span data-status-kind="connection" className={`${styles.chip} ${styles[`connection_${account.connectionStatus}`]}`}>{connectionLabel(account.connectionStatus)}</span></span></span>
    {account.profileUrl && <ExternalLink size={17} aria-hidden />}
  </>;
  return account.profileUrl ? <a className={styles.account} href={account.profileUrl} target="_blank" rel="noopener noreferrer">{content}</a> : <div className={styles.account}>{content}</div>;
}

function Network({ network }: { network: PublicRecoveryNetwork }) {
  return <article className={`${styles.network} ${network.affected ? styles.affected : ""}`}>
    <p className={styles.eyebrow}>{network.affected ? "Affected protected Main account" : "Protected Main account"}</p>
    <Account account={network.mainAccount} role="main" />
    <div className={styles.connector}>If you can&apos;t reach {network.mainAccount.displayName}</div>
    <p className={styles.eyebrow}>Recovery destinations</p>
    {network.recoveryAccounts.length ? <div className={styles.recoveries}>{network.recoveryAccounts.map(account => <Account key={`${account.provider}-${account.profileUrl}-${account.displayName}`} account={account} role="recovery" />)}</div> : <p className={styles.empty}>No Recovery destinations configured for this account yet.</p>}
  </article>;
}

export function PublicVerifiedIdentityView({ identity, preview = false }: { identity: PublicVerifiedIdentity; preview?: boolean }) {
  const emergencyNetwork = identity.recoveryNetworks.find(network => network.affected);
  return <main className={styles.page} data-preview={preview || undefined}>
    <div className={styles.shell}>
      <div className={styles.brand}><AudienceOwnLogo size={25} /></div>
      <section className={styles.hero}>
        <span className={styles.avatar}>{identity.creator.avatar ? <Image unoptimized fill sizes="88px" src={identity.creator.avatar} alt="" /> : initials(identity.creator.displayName)}<i><ShieldCheck size={12} /></i></span>
        <h1>{identity.creator.displayName}</h1>
        <span className={`${styles.status} ${identity.verification.verified ? "" : styles.pending}`}><BadgeCheck size={17} />{identity.verification.label}</span>
        {identity.presentation.publicTitle && <p className={styles.publicTitle}>{identity.presentation.publicTitle}</p>}
        {identity.presentation.publicSummary && <p className={styles.summary}>{identity.presentation.publicSummary}</p>}
      </section>
      {identity.activeEmergencyState && <section className={styles.alert} role="status"><CircleAlert size={24} /><div><strong>{identity.activeEmergencyState.kind === "platform_migration" ? "PLATFORM MIGRATION" : "ACCOUNT CURRENTLY INACCESSIBLE"}</strong><h2>{identity.activeEmergencyState.affectedAccount?.displayName ?? identity.activeEmergencyState.title} is currently {identity.activeEmergencyState.kind === "platform_migration" ? "moving platforms" : "inaccessible"}.</h2><p>{identity.activeEmergencyState.kind === "platform_migration" && identity.activeEmergencyState.replacement ? <>Use the verified destination <a href={identity.activeEmergencyState.replacement.url}>{identity.activeEmergencyState.replacement.handle ?? identity.activeEmergencyState.replacement.provider}</a>.</> : <>Use {identity.creator.displayName}&apos;s trusted recovery destinations below to stay connected{emergencyNetwork?.recoveryAccounts.length ? "." : " as they become available."}</>}</p></div></section>}
      <section className={styles.section} aria-labelledby="official-title"><div className={styles.heading}><p>Creator accounts</p><h2 id="official-title">Main accounts</h2><span>Accounts {identity.creator.displayName} has added as their primary public presence.</span></div>{identity.officialAccounts.length ? <div className={styles.accountGrid}>{identity.officialAccounts.map(account => <Account key={`${account.provider}-${account.profileUrl}-${account.displayName}`} account={account} role="main" />)}</div> : <p className={styles.empty}>No public Main accounts are available yet.</p>}</section>
      <section className={styles.section} aria-labelledby="network-title"><div className={styles.heading}><p>Continuity map</p><h2 id="network-title">Recovery Network</h2><span>Trusted places {identity.creator.displayName} has configured for continuity if a Main account becomes unavailable.</span></div>{identity.recoveryNetworks.length ? <div className={styles.networkGrid}>{identity.recoveryNetworks.map(network => <Network key={`${network.mainAccount.provider}-${network.mainAccount.profileUrl}-${network.mainAccount.displayName}`} network={network} />)}</div> : <p className={styles.empty}>No Recovery Networks have been configured yet.</p>}</section>
      <section className={styles.pass}><p className={styles.eyebrow}>Stay connected with {identity.creator.displayName}</p><h2>Join {identity.creator.displayName}&apos;s Recovery Pass</h2><p>Stay connected even if a platform account becomes unavailable.</p><a className={styles.cta} href={identity.recoveryPass.url}>Join Recovery Pass <ArrowRight size={17} /></a></section>
      <p className={styles.footer}>AudienceOwn · Verified recovery network</p>
    </div>
  </main>;
}
