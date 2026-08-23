/**
 * Permanent public share-asset origin.
 *
 * Never replace this with a browser, request-header, deployment-preview, or
 * loopback-derived origin. Relative URLs belong only to in-app navigation.
 */
export const CANONICAL_PUBLIC_ORIGIN="https://audienceown.com";

export function canonicalPublicOrigin(environment:Partial<Pick<NodeJS.ProcessEnv,"NODE_ENV"|"AUTHENTICITY_PUBLIC_BASE_URL"|"PUBLIC_APP_URL"|"APP_URL">>=process.env){
  const configured=environment.AUTHENTICITY_PUBLIC_BASE_URL??environment.PUBLIC_APP_URL??environment.APP_URL;
  if(environment.NODE_ENV==="production"&&configured){const parsed=new URL(configured);if(parsed.protocol!=="https:"||parsed.origin!==CANONICAL_PUBLIC_ORIGIN)throw new Error(`Canonical public origin must be ${CANONICAL_PUBLIC_ORIGIN}.`);}
  return CANONICAL_PUBLIC_ORIGIN;
}
export function getPublicVerificationUrl(slug:string,environment?:Partial<Pick<NodeJS.ProcessEnv,"NODE_ENV"|"AUTHENTICITY_PUBLIC_BASE_URL"|"PUBLIC_APP_URL"|"APP_URL">>){return`${canonicalPublicOrigin(environment)}/verify/${encodeURIComponent(slug)}`}
export function getPublicRecoveryPassUrl(slug:string,environment?:Partial<Pick<NodeJS.ProcessEnv,"NODE_ENV"|"AUTHENTICITY_PUBLIC_BASE_URL"|"PUBLIC_APP_URL"|"APP_URL">>){return`${canonicalPublicOrigin(environment)}/c/${encodeURIComponent(slug)}`}
