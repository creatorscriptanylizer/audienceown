import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { NormalizedEcosystemWebhookEvent } from "./types";

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string | undefined, prefix = "sha256=") {
  if (!secret || !signature?.startsWith(prefix)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex"), supplied = signature.slice(prefix.length);
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}
const githubTypes: Record<string, string> = { renamed:"canonical_url_changed", transferred:"destination_transferred", archived:"destination_archived", unarchived:"destination_restored", privatized:"visibility_changed", publicized:"visibility_changed", deleted:"destination_deleted", suspended:"grant_revoked", unsuspended:"verification_restored" };
const githubTargetSchema=z.object({id:z.union([z.number().int().nonnegative(),z.string().regex(/^\d+$/)]),name:z.string().optional(),login:z.string().optional(),full_name:z.string().optional(),html_url:z.string().url().optional(),private:z.boolean().optional(),archived:z.boolean().optional()}).passthrough();
const githubPayloadSchema=z.object({action:z.string().optional(),repository:githubTargetSchema.optional(),organization:githubTargetSchema.optional(),installation:z.object({account:githubTargetSchema.optional()}).passthrough().optional()}).passthrough();
export function normalizeGitHubWebhook(rawBody:string,headers:Headers,now=Date.now()):NormalizedEcosystemWebhookEvent|null{
  if(!verifyWebhookSignature(rawBody,headers.get("x-hub-signature-256"),process.env.GITHUB_WEBHOOK_SECRET))throw new Error("invalid_webhook_signature");
  const id=headers.get("x-github-delivery"),event=headers.get("x-github-event");if(!id||!event)return null;
  let parsed:unknown;try{parsed=JSON.parse(rawBody);}catch{return null;}const result=githubPayloadSchema.safeParse(parsed);if(!result.success)return null;const payload=result.data,action=payload.action??"";
  const target=payload.repository??payload.organization??payload.installation?.account;if(!target?.id)return null;
  const observation=githubTypes[action]??(event==="repository"?"display_name_changed":null);if(!observation)return null;
  return{eventId:id,eventType:observation,stableExternalId:String(target.id),destinationType:payload.repository?"repository":payload.organization?"organization":undefined,observedAt:new Date(now).toISOString(),authoritative:true,state:{displayName:target.name??target.login,displayHandle:target.full_name??target.login,canonicalUrl:target.html_url,visibility:target.private?"private":target.archived?"unavailable":"public",authorityState:action==="suspended"||action==="deleted"?"revoked":"valid"}};
}
export function webhookSecretFor(provider:string){return provider==="github"?process.env.GITHUB_WEBHOOK_SECRET:provider==="discord"?process.env.DISCORD_WEBHOOK_SECRET:provider==="patreon"?process.env.PATREON_WEBHOOK_SECRET:undefined;}
 
