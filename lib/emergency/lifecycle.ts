import type{EmergencyStatus}from"./types";
export const emergencyTransitions:Record<EmergencyStatus,readonly EmergencyStatus[]>={draft:["pending_verification","pending_approval","cancelled"],
pending_verification:["pending_approval","cancelled"],pending_approval:["ready","pending_verification","cancelled"],ready:["active","pending_approval","pending_verification","cancelled"],
active:["resolved"],resolved:[],cancelled:[]};
export function canTransitionEmergency(from:EmergencyStatus,to:EmergencyStatus){return emergencyTransitions[from].includes(to);}
export function requiresRecentReauthentication(severity:string,action:string){return severity==="critical"&&action==="activate";}

