export const authorizationPurposes=["approve_critical_incident","activate_critical_incident","verify_replacement_account","change_active_replacement","resolve_critical_incident"]as const;
export const assuranceLevels=["recent_login","password","mfa","passkey"]as const;
export type AssuranceLevel=typeof assuranceLevels[number];
const assuranceRank:Record<AssuranceLevel,number>={recent_login:0,password:1,mfa:2,passkey:3};
export function authorizationSatisfies(actual:AssuranceLevel,minimum:AssuranceLevel){return assuranceRank[actual]>=assuranceRank[minimum];}
export function authorizationSessionState(session:{expires_at:string;consumed_at:string|null;revoked_at:string|null},now=Date.now()){
if(session.revoked_at)return"revoked";if(session.consumed_at)return"consumed";if(Date.parse(session.expires_at)<=now)return"expired";return"ready";}
