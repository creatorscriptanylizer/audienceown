export const RECOVERY_READINESS_CHECKS = [
  { id: "page", label: "Recovery page published", href: "/dashboard/creator-page" },
  { id: "pass", label: "Recovery Pass enabled", href: "/dashboard/settings" },
  { id: "official", label: "Verified official account", href: "/dashboard/identity" },
  { id: "backup", label: "Verified backup account", href: "/dashboard/platforms" },
  { id: "plan", label: "Emergency plan validated", href: "/dashboard/emergency" },
] as const;

export type RecoveryReadinessCheckId = typeof RECOVERY_READINESS_CHECKS[number]["id"];
export type RecoveryReadinessCheckStatus = "complete" | "incomplete" | "unavailable";
export type RecoveryReadinessState = "Not configured" | "Getting started" | "Partially ready" | "Almost ready" | "Recovery ready" | "Readiness unavailable";
export type RecoveryReadiness = {
  availability: "available" | "unavailable";
  score: number | null;
  state: RecoveryReadinessState;
  checklist: Array<{ key:RecoveryReadinessCheckId;label:string;status:RecoveryReadinessCheckStatus;href:string }>;
};

export function recoveryReadinessState(score:number):RecoveryReadinessState {
  if(score===0)return "Not configured";
  if(score<40)return "Getting started";
  if(score<80)return "Partially ready";
  if(score<100)return "Almost ready";
  return "Recovery ready";
}

export function calculateRecoveryReadiness(statuses:Record<RecoveryReadinessCheckId,RecoveryReadinessCheckStatus>):RecoveryReadiness {
  const checklist=RECOVERY_READINESS_CHECKS.map(item=>({...item,key:item.id,status:statuses[item.id]}));
  if(checklist.some(item=>item.status==="unavailable"))return{availability:"unavailable",score:null,state:"Readiness unavailable",checklist};
  const completed=checklist.filter(item=>item.status==="complete").length;
  const score=Math.round(completed/checklist.length*100);
  return{availability:"available",score,state:recoveryReadinessState(score),checklist};
}
