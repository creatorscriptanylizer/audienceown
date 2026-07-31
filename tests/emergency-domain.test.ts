import{describe,expect,it}from"vitest";import{canTransitionEmergency,emergencyTransitions,requiresRecentReauthentication}from"@/lib/emergency/lifecycle";
import{emergencyInputSchema,replacementSchema,verificationSchema}from"@/lib/emergency/schemas";import{applyPublicEmergency}from"@/lib/emergency/public-banner";
import type{CreatorRecord}from"@/lib/public-creators";
const creator:CreatorRecord={handle:"creator",displayName:"Creator",verified:true,recoveryPassPublished:true,emergencyMode:false,lastVerifiedAt:"2026-01-01T00:00:00Z",
recoveryCoreFans:10,officialLinks:[{id:"youtube",platform:"YouTube",label:"@main",url:"https://youtube.com/@main",action:"Subscribe"}],recoveryRoutes:{}};
describe("verified emergency domain",()=>{
it("defines only controlled lifecycle transitions",()=>{expect(canTransitionEmergency("draft","pending_approval")).toBe(true);expect(canTransitionEmergency("ready","active")).toBe(true);
expect(canTransitionEmergency("active","draft")).toBe(false);expect(emergencyTransitions.resolved).toEqual([]);});
it("requires recent reauthentication only for critical activation",()=>{expect(requiresRecentReauthentication("critical","activate")).toBe(true);
expect(requiresRecentReauthentication("important","activate")).toBe(false);expect(requiresRecentReauthentication("critical","approve")).toBe(false);});
it("validates supported emergency inputs",()=>{expect(emergencyInputSchema.parse({emergency_type:"scam_warning",severity:"critical",title:"Warning",message:"Verified facts",
affected_account_id:"f4100000-0000-4000-8000-000000000001"}).emergency_type).toBe("scam_warning");expect(()=>emergencyInputSchema.parse({})).toThrow();});
it("requires HTTPS replacement profiles and an explicit verification method",()=>{expect(()=>replacementSchema.parse({provider:"x",stable_provider_account_id:"1",display_handle:"@safe",
canonical_profile_url:"javascript:alert(1)"})).toThrow();expect(verificationSchema.parse({provider:"x",stable_provider_account_id:"1",display_handle:"@safe",
canonical_profile_url:"https://x.com/safe",verification_method:"oauth",official:true}).official).toBe(true);});
it("renders active emergency data with a verified official route",()=>{const result=applyPublicEmergency(creator,{emergency_type:"account_hacked",severity:"critical",title:"Alert",
message:"Use our verified backup.",updated_at:"2026-08-11T10:00:00Z",affected:{provider:"youtube",display_handle:"@main",canonical_profile_url:"https://youtube.com/@main"},
replacement:{provider:"youtube",display_handle:"@backup",canonical_profile_url:"https://youtube.com/@backup",verified_at:"2026-08-11T09:00:00Z"}});
expect(result.emergencyMode).toBe(true);expect(result.recoveryRoutes.youtube.primary.handle).toBe("@backup");expect(result.officialLinks[0].label).toContain("Affected");});
it("removes the emergency banner after resolution",()=>{expect(applyPublicEmergency({...creator,emergencyMode:true},null).emergencyMode).toBe(false);});
});

