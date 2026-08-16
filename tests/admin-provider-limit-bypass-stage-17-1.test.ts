import {afterEach,describe,expect,it,vi} from "vitest";
import {isConfiguredAdminEmail} from "@/lib/app-admin";
import {providerPickerState} from "@/components/platforms-manager";
import type {ProviderConnectionCapability} from "@/lib/social-providers/types";

const configured={provider:"youtube",displayName:"YouTube",description:"YouTube",implementationStatus:"implemented",configurationStatus:"configured",reviewStatus:"not_applicable",connectable:true,connectPath:"/api/integrations/youtube/connect",oauthSupported:true,oauthStatus:"available",manualSupported:false,manualInput:"channel_url",supportsAudienceMetrics:true,audienceUnit:"subscribers",supportsAutomaticVerification:true,supportsManualVerification:false,supportsWebhooks:false,supportsPolling:true} satisfies ProviderConnectionCapability;

describe("AudienceOwn administrator provider-limit bypass",()=>{
  afterEach(()=>vi.unstubAllEnvs());
  it("parses a case-insensitive comma-separated server allowlist",()=>{
    vi.stubEnv("AUDIENCEOWN_ADMIN_EMAILS"," first@example.test, ENKIAKKA@GMAIL.COM ,second@example.test ");
    expect(isConfiguredAdminEmail("enkiakka@gmail.com")).toBe(true);
    expect(isConfiguredAdminEmail(" EnkiAkka@Gmail.com ")).toBe(true);
    expect(isConfiguredAdminEmail("creator@example.test")).toBe(false);
    expect(isConfiguredAdminEmail(undefined)).toBe(false);
  });
  it("fails closed when the server allowlist is missing",()=>{
    vi.stubEnv("AUDIENCEOWN_ADMIN_EMAILS","");
    expect(isConfiguredAdminEmail("enkiakka@gmail.com")).toBe(false);
  });
  it("keeps provider configuration ahead of quantity messaging",()=>{
    expect(providerPickerState(configured,false,"official",false)).toMatchObject({label:"Connect",disabled:false});
    expect(providerPickerState({...configured,connectable:false,configurationStatus:"missing"},false,"official",false)).toMatchObject({label:"Setup required",disabled:true});
  });
});
