import { describe, expect, it } from "vitest";
import { providerAudienceCapabilities } from "@/lib/platform-audience/capabilities";
import { normalizeProviderAudience } from "@/lib/platform-audience/normalize";
import { normalizeAudienceCount } from "@/lib/platform-audience/types";

describe("platform audience metrics",()=>{
 it("defines one centralized capability for every approved platform",()=>expect(Object.keys(providerAudienceCapabilities)).toEqual(["youtube","instagram","tiktok","x","spotify","twitch","linkedin","facebook","snapchat","threads","pinterest","discord"]));
 it("normalizes exact, approximate, hidden, and zero metrics",()=>{expect(normalizeProviderAudience("youtube",{items:[{statistics:{subscriberCount:"1240",hiddenSubscriberCount:false}}]})).toEqual({count:1240,status:"available",approximate:true});expect(normalizeProviderAudience("youtube",{items:[{statistics:{hiddenSubscriberCount:true}}]}).count).toBeNull();expect(normalizeProviderAudience("discord",{approximate_member_count:0}).count).toBe(0);});
 it("validates provider response shapes at runtime",()=>expect(()=>normalizeProviderAudience("tiktok",{data:{user:{follower_count:-1}},error:{code:"ok"}})).toThrow());
 it("rejects negative, fractional, and unsafe counts",()=>{for(const value of[-1,1.5,Number.MAX_SAFE_INTEGER+1])expect(()=>normalizeAudienceCount(value)).toThrow("invalid_audience_count");});
 it("keeps restricted product access unapproved",()=>{expect(providerAudienceCapabilities.snapchat.accessRequirement).toBe("allowlist");expect(providerAudienceCapabilities.threads.supported).toBe(false);expect(providerAudienceCapabilities.x.accessRequirement).toBe("paid_tier");});
});
