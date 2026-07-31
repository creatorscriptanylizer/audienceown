import{isIP}from"node:net";
import{resolve4,resolve6}from"node:dns/promises";
const reservedV4=[/^10\./,/^127\./,/^169\.254\./,/^192\.168\./,/^0\./,/^224\./,/^255\./,/^172\.(1[6-9]|2\d|3[01])\./,/^192\.0\.0\./,/^192\.0\.2\./,/^198\.51\.100\./,/^203\.0\.113\./];
export function isPublicIp(value:string){const version=isIP(value);if(version===4)return!reservedV4.some(x=>x.test(value));
if(version===6){const v=value.toLowerCase();return v!=="::"&&v!=="::1"&&!v.startsWith("fe80:")&&!v.startsWith("fc")&&!v.startsWith("fd")&&!v.startsWith("2001:db8:");}return false;}
export function domainChallengeUrl(domain:string){const host=domain.trim().toLowerCase().replace(/\.$/,"");
if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host))throw new Error("domain_invalid");
return new URL(`https://${host}/.well-known/audienceown-verification.txt`);}
export function validateDomainRedirect(origin:URL,target:URL){if(target.protocol!=="https:"||target.hostname!==origin.hostname)throw new Error("domain_redirect_rejected");}
export function exactChallengeMatch(body:string,phrase:string){return body.trim()===phrase;}
export async function assertPublicDomain(hostname:string){const addresses=[...(await resolve4(hostname).catch(()=>[])),...(await resolve6(hostname).catch(()=>[]))];if(!addresses.length||addresses.some(ip=>!isPublicIp(ip)))throw new Error("domain_address_rejected");return addresses;}
export async function fetchDomainChallenge(domain:string,phrase:string,options:{timeoutMs:number;maxBytes:number}){const url=domainChallengeUrl(domain);await assertPublicDomain(url.hostname);const response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(options.timeoutMs),headers:{accept:"text/plain"}});
if(response.status>=300&&response.status<400)throw new Error("domain_redirect_rejected");if(!response.ok)throw new Error("domain_challenge_unavailable");const length=Number(response.headers.get("content-length")??0);if(length>options.maxBytes)throw new Error("domain_response_too_large");const body=await response.text();if(Buffer.byteLength(body)>options.maxBytes)throw new Error("domain_response_too_large");return exactChallengeMatch(body,phrase);}
