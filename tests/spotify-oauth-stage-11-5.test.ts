import {afterEach,describe,expect,it,vi} from "vitest";
import {fetchSpotifyIdentity,refreshSpotifyToken} from "@/lib/providers/spotify";
import {providerAudienceCapabilities} from "@/lib/platform-audience/capabilities";
import {providerConnectionCapability} from "@/lib/social-providers/connection-capabilities";
import {getSocialProvider} from "@/lib/social-providers/registry";
import {readFileSync} from "node:fs";

const env={...process.env};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
afterEach(()=>{process.env={...env};vi.restoreAllMocks();vi.unstubAllGlobals();});

describe("Stage 11.5 Spotify OAuth",()=>{
  it("is implemented and connectable only with valid configuration",()=>{
    process.env.SPOTIFY_CLIENT_ID="client";process.env.SPOTIFY_CLIENT_SECRET="secret";process.env.SPOTIFY_REDIRECT_URI="http://127.0.0.1:3000/api/integrations/spotify/callback";
    expect(providerConnectionCapability(getSocialProvider("spotify"))).toMatchObject({implementationStatus:"implemented",configurationStatus:"configured",connectable:true,connectPath:"/api/integrations/spotify/connect",supportsAudienceMetrics:false,audienceUnit:null});
    process.env.SPOTIFY_REDIRECT_URI="http://localhost:3000/api/integrations/spotify/callback";
    expect(providerConnectionCapability(getSocialProvider("spotify"))).toMatchObject({configurationStatus:"invalid",connectable:false});
  });

  it("uses account_id and records an honest user-only identity",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(response({account_id:"stable",id:"legacy",display_name:"Artist listener",external_urls:{spotify:"https://open.spotify.com/user/legacy"},followers:{total:99}})));
    const identity=await fetchSpotifyIdentity("access");
    expect(identity.id).toBe("stable");expect(identity.metadata).toMatchObject({spotifyAssetType:"user",audienceMetricSupported:false,artistOwnershipEstablished:false,showOwnershipEstablished:false});expect(identity.metadata).not.toHaveProperty("followers");
  });

  it("preserves an omitted refresh token and rotates one when returned",async()=>{
    process.env.SPOTIFY_CLIENT_ID="client";process.env.SPOTIFY_CLIENT_SECRET="secret";
    const fetch=vi.fn().mockResolvedValueOnce(response({access_token:"a1",token_type:"Bearer",expires_in:3600})).mockResolvedValueOnce(response({access_token:"a2",refresh_token:"rotated",token_type:"Bearer",expires_in:3600}));vi.stubGlobal("fetch",fetch);
    expect((await refreshSpotifyToken("existing")).refreshToken).toBe("existing");expect((await refreshSpotifyToken("existing")).refreshToken).toBe("rotated");
  });

  it("does not claim asset selection, revocation, polling, or audience metrics",()=>{
    const adapter=getSocialProvider("spotify"),audience=providerAudienceCapabilities.spotify;
    expect(adapter.capabilities).toMatchObject({oauth:true,tokenRefresh:true,tokenRevocation:false,polling:false,contentDetection:false});expect(adapter.discoverAssets).toBeUndefined();expect(audience).toMatchObject({supported:false,identityObject:"user",requiresSelectedAsset:false,officialField:null,audienceUnit:null});
  });

  it("uses shared signed-state routes for both roles, reconnect, PKCE, cleanup, and exact disconnect",()=>{
    const connect=readFileSync("app/api/integrations/[provider]/connect/route.ts","utf8"),callback=readFileSync("app/api/integrations/[provider]/callback/route.ts","utf8"),disconnect=readFileSync("app/api/integrations/[provider]/disconnect/route.ts","utf8");
    expect(connect).toContain('role=requestUrl.searchParams.get("role")==="backup"?"backup":"official"');expect(connect).toContain("connectionId");expect(connect).toContain('createOAuthState({creatorId:creator.id,userId:user.id,provider:raw,nonce,role,connectionId');expect(connect).toContain("adapter.pkce?createPkce():null");expect(getSocialProvider("spotify").pkce).toBe(true);
    expect(callback).toContain('raw==="tiktok"||raw==="x"||raw==="spotify"');expect(callback).toContain("reconnect_mismatch");expect(callback).toContain("encryptSocialSecret(tokens.accessToken)");expect(callback).toContain("if(createdId)");expect(callback.replace(/\s+/g,"")).toContain('provider:rawas"instagram"|"tiktok"|"x"|"spotify"');
    expect(disconnect).toContain('eq("id",parsed.data.connectionId)');expect(disconnect).toContain('"spotify","discord","snapchat"].includes(provider)');
  });

  it("labels the connected identity and unsupported metric without showing zero",()=>{
    const ui=readFileSync("components/platforms-manager.tsx","utf8");expect(ui).toContain("Spotify profile");expect(ui).toContain("Audience metric unavailable");
  });
});
