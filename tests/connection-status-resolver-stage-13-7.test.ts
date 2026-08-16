import {describe,expect,it} from "vitest";
import {resolveConnectionStatus} from "@/lib/social-providers/connection-health";

describe("connection status resolver",()=>{
  it("keeps ready and review-limited healthy accounts connected",()=>{
    expect(resolveConnectionStatus({health:"healthy",providerStatus:"ready"})).toMatchObject({connectionLabel:"Connected",actionRequired:false,capabilityNotice:null});
    expect(resolveConnectionStatus({health:"healthy",providerStatus:"app_review_required"})).toMatchObject({connectionLabel:"Connected",actionRequired:false,capabilityResponsibility:"provider_or_developer"});
    expect(resolveConnectionStatus({health:"healthy",providerStatus:"provider_review_required"})).toMatchObject({connectionLabel:"Connected",actionRequired:false,capabilityResponsibility:"provider_or_developer"});
  });
  it.each(["asset_selection_required","public_invite_required","public_url_required","reconnect_required"])("requires creator action for %s",providerStatus=>{expect(resolveConnectionStatus({health:"healthy",providerStatus})).toMatchObject({actionRequired:true,capabilityResponsibility:"creator"});});
  it.each(["revoked","expired"])("does not call %s credentials connected",health=>{expect(resolveConnectionStatus({health,providerStatus:"ready"})).toMatchObject({connectionLabel:"Connection lost",connectionTone:"danger",actionRequired:true});});
  it("does not reduce readiness for informational capability limitations",()=>{for(const providerStatus of ["app_review_required","provider_review_required","configuration_pending","automatic_detection_unavailable","missing_approved_scope"]){expect(resolveConnectionStatus({health:"healthy",providerStatus}).actionRequired).toBe(false);}});
  it("preserves healthy YouTube behavior",()=>{expect(resolveConnectionStatus({health:"healthy",providerStatus:"ready"})).toMatchObject({connectionLabel:"Connected",connectionTone:"success",actionRequired:false});});
});
