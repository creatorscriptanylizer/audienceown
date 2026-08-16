import { describe, expect, it } from "vitest";
import { providerAudienceCapabilities } from "@/lib/platform-audience/capabilities";
import { normalizeProviderAudience } from "@/lib/platform-audience/normalize";
import { normalizeAudienceCount } from "@/lib/platform-audience/types";

describe("platform audience metrics",()=>{
 it("defines one centralized capability for every approved platform",()=>expect(Object.keys(providerAudienceCapabilities)).toEqual(["youtube","instagram","tiktok","x","spotify","twitch","linkedin","facebook","snapchat","pinterest","discord"]));
 it.each([["0",0],["1",1],["1234",1234],["12500",12500]] as const)("preserves YouTube subscriber count %s",(subscriberCount,count)=>expect(normalizeProviderAudience("youtube",{items:[{statistics:{subscriberCount,hiddenSubscriberCount:false}}]})).toEqual({count,status:"available",approximate:true}));
 it("keeps hidden and missing YouTube counts distinct",()=>{expect(normalizeProviderAudience("youtube",{items:[{statistics:{hiddenSubscriberCount:true}}]})).toEqual({count:null,status:"hidden",approximate:true});expect(()=>normalizeProviderAudience("youtube",{items:[{statistics:{hiddenSubscriberCount:false}}]})).toThrow("invalid_audience_count");expect(normalizeProviderAudience("discord",{approximate_member_count:0}).count).toBe(0);});
 it("validates provider response shapes at runtime",()=>expect(()=>normalizeProviderAudience("tiktok",{data:{user:{follower_count:-1}},error:{code:"ok"}})).toThrow());
 it("rejects negative, fractional, and unsafe counts",()=>{for(const value of[-1,1.5,Number.MAX_SAFE_INTEGER+1])expect(()=>normalizeAudienceCount(value)).toThrow("invalid_audience_count");});
 it("keeps restricted product access unapproved",()=>{expect(providerAudienceCapabilities.snapchat.accessRequirement).toBe("allowlist");expect(providerAudienceCapabilities.x.accessRequirement).toBe("paid_tier");});
 it.each([0,24100])("preserves an exact LinkedIn organization follower count of %i",count=>expect(normalizeProviderAudience("linkedin",{firstDegreeSize:count})).toEqual({count,status:"available",approximate:false}));
});
