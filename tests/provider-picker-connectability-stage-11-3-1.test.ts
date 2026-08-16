import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {providerPickerState} from "@/components/platforms-manager";
import {providerConnectionCapability} from "@/lib/social-providers/connection-capabilities";
import {getSocialProvider} from "@/lib/social-providers/registry";

const original={...process.env};
const configure=()=>Object.assign(process.env,{
  GOOGLE_YOUTUBE_CLIENT_ID:"youtube-id",GOOGLE_YOUTUBE_CLIENT_SECRET:"youtube-secret",GOOGLE_YOUTUBE_REDIRECT_URI:"https://app.test/api/integrations/youtube/callback",YOUTUBE_OAUTH_STATE_SECRET:"state",
  INSTAGRAM_CLIENT_ID:"instagram-id",INSTAGRAM_CLIENT_SECRET:"instagram-secret",INSTAGRAM_REDIRECT_URI:"https://app.test/api/integrations/instagram/callback",INSTAGRAM_APP_REVIEW_STATUS:"required",
  META_APP_ID:"meta-id",META_APP_SECRET:"meta-secret",META_REDIRECT_URI:"https://app.test/api/integrations/meta/callback",META_APP_REVIEW_STATUS:"required",
  TIKTOK_CLIENT_KEY:"tiktok-key",TIKTOK_CLIENT_SECRET:"tiktok-secret",TIKTOK_REDIRECT_URI:"https://app.test/api/integrations/tiktok/callback",TIKTOK_APP_REVIEW_STATUS:"required",
});

describe("Stage 11.3.1 provider picker connectability",()=>{
  beforeEach(()=>{configure();vi.restoreAllMocks();});
  afterEach(()=>{process.env={...original};vi.restoreAllMocks();});

  it.each([
    ["instagram","/api/integrations/instagram/connect"],
    ["facebook","/api/integrations/facebook/connect"],
    ["tiktok","/api/integrations/tiktok/connect"],
  ] as const)("keeps configured, review-required %s development OAuth connectable",(provider,path)=>{
    const capability=providerConnectionCapability(getSocialProvider(provider));
    expect(capability).toMatchObject({implementationStatus:"implemented",configurationStatus:"configured",reviewStatus:"required",oauthStatus:"review_required",connectable:true,connectPath:path});
    expect(providerPickerState(capability,false,"official")).toMatchObject({disabled:false,label:"App review required · Connect",href:`${path}?role=official`});
  });

  it.each([
    ["instagram","INSTAGRAM_CLIENT_SECRET"],
    ["facebook","META_APP_SECRET"],
    ["tiktok","TIKTOK_CLIENT_SECRET"],
  ] as const)("renders configured implementation %s as Setup required when %s is missing",(provider,missing)=>{
    delete process.env[missing];const capability=providerConnectionCapability(getSocialProvider(provider));
    expect(capability).toMatchObject({implementationStatus:"implemented",configurationStatus:"missing",connectable:false,oauthStatus:"not_configured"});
    expect(providerPickerState(capability,false,"official")).toMatchObject({disabled:true,label:"Setup required",href:null});
  });

  it("shows invalid configuration distinctly and never initiates OAuth",()=>{
    process.env.INSTAGRAM_REDIRECT_URI="javascript:invalid";const capability=providerConnectionCapability(getSocialProvider("instagram"));
    expect(capability).toMatchObject({configurationStatus:"invalid",connectable:false,oauthStatus:"not_configured"});expect(providerPickerState(capability,false,"official")).toMatchObject({disabled:true,label:"Configuration error",href:null});
  });

  it("disables only the exact connected official provider",()=>{
    const youtube=providerConnectionCapability(getSocialProvider("youtube")),instagram=providerConnectionCapability(getSocialProvider("instagram")),facebook=providerConnectionCapability(getSocialProvider("facebook")),tiktok=providerConnectionCapability(getSocialProvider("tiktok"));
    expect(providerPickerState(youtube,true,"official")).toMatchObject({disabled:true,label:"Connected"});
    for(const capability of [instagram,facebook,tiktok])expect(providerPickerState(capability,false,"official").disabled).toBe(false);
  });

  it("keeps a missing-configuration X implementation disabled as Setup required",()=>{
    delete process.env.X_CLIENT_ID;delete process.env.X_CLIENT_SECRET;delete process.env.X_REDIRECT_URI;const capability=providerConnectionCapability(getSocialProvider("x"));expect(capability).toMatchObject({implementationStatus:"implemented",configurationStatus:"missing",connectable:false,connectPath:"/api/integrations/x/connect"});expect(providerPickerState(capability,false,"official")).toMatchObject({disabled:true,label:"Setup required",href:null});
  });

  it("generates exact official and backup roles without cross-role global disabling",()=>{
    const capability=providerConnectionCapability(getSocialProvider("tiktok"));expect(providerPickerState(capability,false,"official").href).toBe("/api/integrations/tiktok/connect?role=official");expect(providerPickerState(capability,false,"backup")).toMatchObject({disabled:false,href:"/api/integrations/tiktok/connect?role=backup"});
  });

  it("emits safe development diagnostics when AUDIENCEOWN_DEBUG=1",()=>{
    process.env.AUDIENCEOWN_DEBUG="1";const info=vi.spyOn(console,"info").mockImplementation(()=>undefined);providerConnectionCapability(getSocialProvider("instagram"));const output=JSON.stringify(info.mock.calls);expect(output).toContain("provider_capability");expect(output).toContain('"connectable":true');expect(output).not.toContain("instagram-secret");expect(output).not.toContain("access_token");
  });
});
