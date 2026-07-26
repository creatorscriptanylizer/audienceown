import { describe,expect,it } from "vitest";
import { handleSchema,hashToken,httpsUrlSchema,normaliseEmail,profileCompletion,safeCsvCell,subscriberEligible, creatorSchema } from "@/lib/validation";
import {
 applyManualSlugEdit,
 canSubmitCreatorForm,
 localSlugAvailability,
 slugifyDisplayName,
 syncSlugWithDisplayName,
} from "@/lib/creator-profile";
describe("Stage 1 validation",()=>{
 it("validates slugs and reserved routes",()=>{expect(handleSchema.parse("creator-one")).toBe("creator-one");expect(handleSchema.safeParse("admin").success).toBe(false);expect(handleSchema.safeParse("-bad").success).toBe(false);expect(handleSchema.safeParse("bad--slug").success).toBe(false)});
 it("automatically generates slugs from display names",()=>{
  expect(slugifyDisplayName("Nana")).toBe("nana");
  expect(slugifyDisplayName("Nana Creative")).toBe("nana-creative");
 });
 it("removes accents and punctuation from generated slugs",()=>expect(slugifyDisplayName("Nána & Co.")).toBe("nana-co"));
 it("collapses repeated spaces and hyphens",()=>expect(slugifyDisplayName("  Nana   --  Creative  ")).toBe("nana-creative"));
 it("stops synchronising after a manual slug edit",()=>{
  const generated=syncSlugWithDisplayName({slug:"",manuallyEdited:false},"Nana Creative");
  const manual=applyManualSlugEdit("nana-studio","Nana Creative");
  expect(syncSlugWithDisplayName(manual,"Nana Changed")).toEqual({slug:"nana-studio",manuallyEdited:true});
  expect(generated.slug).toBe("nana-creative");
 });
 it("resumes automatic generation when a manual slug is cleared",()=>{
  expect(applyManualSlugEdit("","Nána Creative")).toEqual({slug:"nana-creative",manuallyEdited:false});
 });
 it("rejects reserved slugs without an availability query",()=>{
  const availability=localSlugAvailability("admin");
  expect(availability.status).toBe("invalid");
  expect(canSubmitCreatorForm(availability)).toBe(false);
 });
 it("rejects unavailable slugs",()=>expect(canSubmitCreatorForm({status:"taken"})).toBe(false));
 it("disables submission while availability is being checked",()=>expect(canSubmitCreatorForm({status:"checking"})).toBe(false));
 it("enforces the biography character limit on server validation",()=>{
  expect(creatorSchema.safeParse({public_slug:"nana",display_name:"Nana",public_bio:"a".repeat(500)}).success).toBe(true);
  expect(creatorSchema.safeParse({public_slug:"nana",display_name:"Nana",public_bio:"a".repeat(501)}).success).toBe(false);
 });
 it("normalises emails",()=>expect(normaliseEmail("  CREATOR@Example.COM ")).toBe("creator@example.com"));
 it("allows secure URLs and rejects javascript",()=>{expect(httpsUrlSchema.safeParse("https://example.com/me").success).toBe(true);expect(httpsUrlSchema.safeParse("javascript:alert(1)").success).toBe(false)});
 it("protects CSV formula cells",()=>{expect(safeCsvCell("=IMPORTXML()")).toBe("\"'=IMPORTXML()\"");expect(safeCsvCell("Jane \"JJ\"")).toBe("\"Jane \"\"JJ\"\"\"")});
 it("hashes tokens deterministically without returning the token",async()=>{const a=await hashToken("secret-token","pepper");expect(a).toHaveLength(64);expect(a).toBe(await hashToken("secret-token","pepper"));expect(a).not.toContain("secret-token")});
 it("calculates profile completion",()=>expect(profileCompletion({public_slug:"abc",display_name:"A",public_bio:"b",profile_image_path:"a",banner_image_path:null,social_count:1})).toBe(83));
 it("filters subscriber eligibility",()=>{expect(subscriberEligible("active",{creator_announcements:true})).toBe(true);expect(subscriberEligible("pending",{creator_announcements:true})).toBe(false);expect(subscriberEligible("active",{creator_announcements:false})).toBe(false)});
});
