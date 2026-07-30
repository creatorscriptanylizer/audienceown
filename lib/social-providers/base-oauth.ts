import { SocialProviderError } from "./errors";
import type { ExchangeContext, ProviderContext, ProviderIdentity, ProviderTokenSet, SocialProvider } from "./types";

export type OAuthConfig = {
  provider: SocialProvider; clientIdEnv: string; clientSecretEnv: string; redirectEnv: string;
  authorizeUrl: string; tokenUrl: string; revokeUrl?: string; scopes: string[];
  clientIdParam?: string;
};
export function configured(config: OAuthConfig) {
  return Boolean(process.env[config.clientIdEnv] && process.env[config.clientSecretEnv] && process.env[config.redirectEnv]);
}
export function authorizationUrl(config: OAuthConfig, state: string, codeChallenge?: string) {
  const clientId = process.env[config.clientIdEnv];
  const redirectUri = process.env[config.redirectEnv];
  if (!clientId || !redirectUri) throw new SocialProviderError("provider_not_configured", config.provider, `${config.provider} is not configured.`);
  const query = new URLSearchParams({
    [config.clientIdParam ?? "client_id"]: clientId, redirect_uri: redirectUri,
    response_type: "code", scope: config.scopes.join(" "), state,
  });
  if (codeChallenge) { query.set("code_challenge", codeChallenge); query.set("code_challenge_method", "S256"); }
  return `${config.authorizeUrl}?${query}`;
}
export async function exchangeCode(config: OAuthConfig, context: ExchangeContext): Promise<ProviderTokenSet> {
  const clientId = process.env[config.clientIdEnv], secret = process.env[config.clientSecretEnv], redirect = process.env[config.redirectEnv];
  if (!clientId || !secret || !redirect) throw new SocialProviderError("provider_not_configured", config.provider, "Provider credentials are unavailable.");
  const body = new URLSearchParams({ client_id: clientId, client_secret: secret, redirect_uri: redirect,
    grant_type: "authorization_code", code: context.code });
  if (context.codeVerifier) body.set("code_verifier", context.codeVerifier);
  const response = await fetch(config.tokenUrl, { method:"POST", headers:{"content-type":"application/x-www-form-urlencoded"}, body, cache:"no-store" });
  const json = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new SocialProviderError(response.status === 400 ? "invalid_grant" : "transient", config.provider, "Authorization exchange failed.");
  const accessToken = typeof json.access_token === "string" ? json.access_token : "";
  if (!accessToken) throw new SocialProviderError("malformed_provider_object", config.provider, "Token response was incomplete.");
  const expires = typeof json.expires_in === "number" ? json.expires_in : null;
  const scope = typeof json.scope === "string" ? json.scope.split(/[ ,]+/).filter(Boolean) : config.scopes;
  return { accessToken, refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expiresAt: expires ? new Date(Date.now()+expires*1000).toISOString() : null, grantedScopes:scope,
    tokenType: typeof json.token_type === "string" ? json.token_type : "Bearer" };
}
export async function refreshToken(config: OAuthConfig, context: ProviderContext): Promise<ProviderTokenSet> {
  const clientId=process.env[config.clientIdEnv],secret=process.env[config.clientSecretEnv];
  if(!clientId||!secret||!context.refreshToken)throw new SocialProviderError("invalid_grant",config.provider,"Refresh authorization is unavailable.");
  const response=await fetch(config.tokenUrl,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:clientId,client_secret:secret,refresh_token:context.refreshToken,grant_type:"refresh_token"}),cache:"no-store"});
  const json=await response.json().catch(()=>({})) as Record<string,unknown>;
  if(!response.ok)throw new SocialProviderError(response.status===400?"invalid_grant":"transient",config.provider,"Token refresh failed.");
  if(typeof json.access_token!=="string")throw new SocialProviderError("malformed_provider_object",config.provider,"Refresh response was incomplete.");
  return{accessToken:json.access_token,refreshToken:typeof json.refresh_token==="string"?json.refresh_token:context.refreshToken,
    expiresAt:typeof json.expires_in==="number"?new Date(Date.now()+json.expires_in*1000).toISOString():null,
    grantedScopes:typeof json.scope==="string"?json.scope.split(/[ ,]+/).filter(Boolean):[],tokenType:typeof json.token_type==="string"?json.token_type:"Bearer"};
}
export async function revoke(config: OAuthConfig, context: ProviderContext) {
  if (!config.revokeUrl) throw new SocialProviderError("provider_capability_not_supported", config.provider, "Revocation is unsupported.");
  await fetch(config.revokeUrl, { method:"POST", headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({token:context.accessToken}), cache:"no-store" });
}
export function identity(id: string, name: string, url: string, metadata: Record<string, unknown> = {}): ProviderIdentity {
  if (!id || !url.startsWith("https://")) throw new Error("Malformed identity");
  return { id, name: name || id, url, metadata };
}
export async function bearerJson(provider:SocialProvider,url:string,accessToken:string,extraHeaders:Record<string,string>={}){
  const response=await fetch(url,{headers:{authorization:`Bearer ${accessToken}`,accept:"application/json",...extraHeaders},cache:"no-store"});
  const body=await response.json().catch(()=>({})) as Record<string,unknown>;
  if(!response.ok)throw new SocialProviderError(response.status===401?"access_revoked":response.status===429?"rate_limited":"transient",provider,"Identity request failed.",
    Number(response.headers.get("retry-after")??0)||undefined);return body;
}
