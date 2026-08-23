import type { BroadcastIntent } from "@/lib/broadcast-studio";

export type RecoverySituation = "hacked" | "suspended" | "blocked" | "inaccessible" | "impersonated" | "other";
export type RecoveryCommunicationDestination = {id:string;provider:string;displayName:string;url:string};

export function recoveryDestinationGuidance(destinations: ReadonlyArray<Pick<RecoveryCommunicationDestination,"provider"|"displayName">>) {
  if (destinations.length === 1) return `Followers will be directed to your verified ${destinations[0].provider} Recovery account.`;
  return `Followers will receive ${destinations.length} trusted Recovery destinations where they can safely find you.`;
}
export function toggleRecoveryDestinationId(current:string[],id:string){return current.includes(id)?current.filter(value=>value!==id):[...current,id];}
export function selectedRecoveryDestinationIdsFrom(data:FormData){return [...new Set(data.getAll("selected_recovery_account_ids").map(String).filter(Boolean))];}

export const recoverySituations = [
  { key:"hacked", intent:"account_hacked", label:"Account hacked", description:"Someone gained unauthorized access." },
  { key:"suspended", intent:"account_banned", label:"Account suspended", description:"The platform suspended or restricted the account." },
  { key:"blocked", intent:"account_banned", label:"Account blocked", description:"The account is blocked or unavailable on the platform." },
  { key:"inaccessible", intent:"account_inaccessible", label:"Cannot access the account", description:"You cannot safely sign in or use the account." },
  { key:"impersonated", intent:"impersonation_warning", label:"Being impersonated", description:"A lookalike account is misleading followers." },
  { key:"other", intent:"account_inaccessible", label:"Other", description:"Another issue makes the Main account unsafe to use." },
] as const satisfies ReadonlyArray<{key:RecoverySituation;intent:BroadcastIntent;label:string;description:string}>;

export function defaultRecoverySituation(intent: BroadcastIntent): RecoverySituation {
  if (intent === "account_hacked") return "hacked";
  if (intent === "account_banned") return "suspended";
  if (intent === "impersonation_warning") return "impersonated";
  return "inaccessible";
}

export function recoveryGuidance(situation: RecoverySituation) {
  if (situation === "hacked") return { summary:"Warn followers about suspicious messages or links and direct them to a trusted Recovery destination.", points:["What happened","What followers should avoid","Where to find you","What happens next"] };
  if (situation === "impersonated") return { summary:"Identify the lookalike account, explain what followers should not trust, and point to your verified identity.", points:["The fake identity","What not to trust","Your verified destination","What happens next"] };
  if (situation === "suspended") return { summary:"Explain the platform restriction factually, then share where updates will continue.", points:["What was suspended","What still works","Where to find you","What happens next"] };
  if (situation === "blocked") return { summary:"Explain what is blocked and direct followers to the linked Recovery destination without speculating about the cause.", points:["What is blocked","What followers should know","Where to find you","What happens next"] };
  if (situation === "other") return { summary:"State the issue in plain language and give followers one trusted next step.", points:["What happened","What followers should know","Where to find you","What happens next"] };
  return { summary:"Explain why the account cannot be used and direct followers to a trusted Recovery destination.", points:["What is inaccessible","What followers should avoid","Where to find you","What happens next"] };
}

export function linkedRecoveryIds(mainAccountId: string, relationships: ReadonlyArray<{main_connected_account_id:string;recovery_connected_account_id:string}>) {
  return new Set(relationships.filter((relationship) => relationship.main_connected_account_id === mainAccountId).map((relationship) => relationship.recovery_connected_account_id));
}
