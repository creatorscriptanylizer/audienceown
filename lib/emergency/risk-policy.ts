export const EMERGENCY_POLICY_VERSION="2026-08-13.1";
export type VerificationConfidence="low"|"medium"|"high";
export type RiskPolicyInput={incidentType:string;severity:string;verificationStatus?:string|null;
verificationConfidence?:VerificationConfidence|null;verificationRevoked?:boolean;stableAccountId?:string|null;
requesterId:string;approverId?:string|null;recentReauthentication:boolean;destinationChange:boolean;
contentApproved:boolean;suspiciousChange?:boolean;wordingAcknowledged?:boolean;deliveryReady?:boolean;
teamRequiresApproval?:boolean;previousVerificationRevoked?:boolean;drillReady?:boolean|null};
export type RiskPolicyDecision={allowed:boolean;requiredApprovals:number;requiresReauthentication:boolean;
minimumVerificationConfidence:VerificationConfidence;blockers:string[];warnings:string[];policyVersion:string};
const rank:Record<VerificationConfidence,number>={low:0,medium:1,high:2};
export function evaluateEmergencyRisk(input:RiskPolicyInput):RiskPolicyDecision{
 const critical=input.severity==="critical",redirect=input.destinationChange;
 const minimumVerificationConfidence:VerificationConfidence=critical&&redirect?"high":redirect?"medium":"low";
 const requiredApprovals=critical||input.teamRequiresApproval?1:0,blockers:string[]=[],warnings:string[]=[];
 if(redirect){if(input.verificationStatus!=="verified")blockers.push("replacement_not_verified");
  if(!input.stableAccountId)blockers.push("stable_identity_missing");
  if(rank[input.verificationConfidence??"low"]<rank[minimumVerificationConfidence])blockers.push("verification_confidence_insufficient");
  if(input.verificationRevoked||input.previousVerificationRevoked)blockers.push("verification_revoked");}
 if(requiredApprovals&&!input.contentApproved)blockers.push("current_content_not_approved");
 if(critical&&input.approverId===input.requesterId)blockers.push("requester_cannot_self_approve");
 if(critical&&!input.approverId)blockers.push("separate_approver_required");
 if(critical&&!input.recentReauthentication)blockers.push("strong_reauthentication_required");
 if(input.suspiciousChange)blockers.push("suspicious_identity_change");
 if(["scam_warning","fake_account_warning"].includes(input.incidentType)&&!input.wordingAcknowledged)blockers.push("wording_acknowledgement_required");
 if(input.deliveryReady===false)blockers.push("delivery_not_ready");
 if(input.drillReady===false)warnings.push("readiness_drill_not_passed");
 return{allowed:blockers.length===0,requiredApprovals,requiresReauthentication:critical,
  minimumVerificationConfidence,blockers,warnings,policyVersion:EMERGENCY_POLICY_VERSION};
}
