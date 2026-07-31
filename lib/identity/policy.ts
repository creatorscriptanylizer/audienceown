import type{IdentityVerificationStatus}from"./types";
export type IdentityAccountPolicyInput={verificationStatus:IdentityVerificationStatus;official:boolean;primary:boolean;publicVisible:boolean;canonicalUrl:string;archivedAt?:string|null;revokedAt?:string|null};
export function evaluateIdentityAccountPolicy(input:IdentityAccountPolicyInput){const blockers:string[]=[];
if((input.official||input.primary)&&input.verificationStatus!=="verified")blockers.push("verified_account_required");
if(input.revokedAt||input.verificationStatus==="revoked")blockers.push("revoked_account_inactive");
if(input.archivedAt||input.verificationStatus==="archived")blockers.push("archived_account_inactive");
if(input.publicVisible&&!input.canonicalUrl.startsWith("https://"))blockers.push("public_url_must_be_https");
return{allowed:blockers.length===0,blockers};}
export function sameCanonicalIdentity(a:{provider:string;stableProviderAccountId:string},b:{provider:string;stableProviderAccountId:string}){return a.provider===b.provider&&a.stableProviderAccountId===b.stableProviderAccountId;}
export function stableIdentityChanged(previous:string,current:string){return previous!==current;}
export function normalizeIdentityHostname(value:string){const hostname=value.trim().toLowerCase().replace(/\.$/,"");if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname))throw new Error("domain_invalid");return hostname;}
