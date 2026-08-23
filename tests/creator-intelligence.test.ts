import { describe, expect, it } from "vitest";
import { deriveCreatorSignals } from "@/lib/intelligence/creator-signals";
import { enhanceCreatorRecommendation, getCreatorIntelligenceBrief } from "@/lib/intelligence/creator-recommendations";
import { toAiSafeCreatorContext, type AudienceOwnCreatorContext } from "@/lib/intelligence/creator-context";

function context(patch: Partial<AudienceOwnCreatorContext> = {}): AudienceOwnCreatorContext {
  return {
    creator:{ creatorId:"creator-a", displayName:"Creator", handle:"creator", recoveryPassEnabled:true, recoveryPassPublished:true },
    platforms:{ officialCount:1, recoveryCount:1, totalCount:2, needsAttentionCount:0, connectionIssues:[] },
    audience:{ protectedAudienceCount:10, recoveryConnectionCount:12, preferenceSummary:[{category:"videos",count:8}] },
    communications:{ recentCount:1, scheduledCount:0, failedCount:0, recentTypes:["new_video"] },
    recovery:{ readinessState:"Recovery ready", readinessPercent:100, destinationCount:1, unresolvedIssues:[] },
    emergency:{ active:false, severity:null, recent:false, planState:"ready" }, availability:{audience:true,destinations:true,communications:true}, calculatedAt:"2026-08-17T12:00:00Z", ...patch,
  };
}

describe("creator intelligence", () => {
  it("recommends the first canonical account for zero accounts", () => {
    const value=context({platforms:{officialCount:0,recoveryCount:0,totalCount:0,needsAttentionCount:0,connectionIssues:[]}}),brief=getCreatorIntelligenceBrief(value);
    expect(brief.signals[0].id).toBe("NO_OFFICIAL_ACCOUNTS");
    expect(brief.topRecommendation).toMatchObject({title:"Connect your first platform",actionId:"ADD_FIRST_ACCOUNT",generatedBy:"deterministic"});
  });

  it("recommends a recovery account after the Main account exists", () => {
    const brief=getCreatorIntelligenceBrief(context({platforms:{officialCount:1,recoveryCount:0,totalCount:1,needsAttentionCount:0,connectionIssues:[]}}));
    expect(brief.signals.some((signal)=>signal.id==="NO_RECOVERY_ACCOUNTS")).toBe(true);
    expect(brief.topRecommendation).toMatchObject({id:"add-recovery-account",actionId:"ADD_RECOVERY_ACCOUNT"});
  });

  it("prioritizes a verified connection issue above setup and growth", () => {
    const issue={provider:"YouTube",role:"official" as const,state:"revoked" as const,explanation:"Authorization was revoked."};
    const value=context({platforms:{officialCount:1,recoveryCount:0,totalCount:1,needsAttentionCount:1,connectionIssues:[issue]},audience:{protectedAudienceCount:0,recoveryConnectionCount:0,preferenceSummary:[]}});
    expect(deriveCreatorSignals(value)[0]).toMatchObject({id:"ACCOUNT_NEEDS_ATTENTION",priority:"critical"});
    expect(getCreatorIntelligenceBrief(value).topRecommendation).toMatchObject({title:"YouTube needs your attention",actionId:"REVIEW_ACCOUNT"});
  });

  it("keeps a healthy setup free of an unnecessary Platforms recommendation", () => {
    const brief=getCreatorIntelligenceBrief(context());
    expect(brief.topRecommendation).toBeNull();
    expect(brief.signals.some((signal)=>signal.id==="HEALTHY_SETUP")).toBe(true);
  });

  it("projects an explicit aggregate-only AI allowlist", () => {
    const unsafe=context() as AudienceOwnCreatorContext & Record<string,unknown>;
    unsafe.oauthAccessToken="token-value"; unsafe.emails=["person@example.test"]; (unsafe.creator as unknown as Record<string,unknown>).serviceRoleSecret="secret";
    const serialized=JSON.stringify(toAiSafeCreatorContext(unsafe));
    for(const forbidden of ["creator-a","token-value","person@example.test","serviceRoleSecret","oauthAccessToken","emails"])expect(serialized).not.toContain(forbidden);
    expect(serialized).toContain('"protectedAudienceCount":10');
  });

  it("rejects unknown actions, unsupported provider claims, and provider failures", async () => {
    const base=getCreatorIntelligenceBrief(context({platforms:{officialCount:0,recoveryCount:0,totalCount:0,needsAttentionCount:0,connectionIssues:[]}})).topRecommendation!;
    const safe=toAiSafeCreatorContext(context());
    expect(await enhanceCreatorRecommendation(base,safe,async()=>({title:"Delete",description:"Delete it",actionId:"DELETE_ACCOUNT"}))).toEqual(base);
    expect(await enhanceCreatorRecommendation(base,safe,async()=>({title:"Instagram suspended",description:"Your Instagram account is suspended.",actionId:"ADD_FIRST_ACCOUNT"}))).toEqual(base);
    expect(await enhanceCreatorRecommendation(base,safe,async()=>{throw new Error("timeout")})).toEqual(base);
  });

  it("requires authenticated server ownership at the context entry point", async () => {
    const source=await import("node:fs/promises").then((fs)=>fs.readFile("lib/intelligence/creator-context.ts","utf8"));
    expect(source).toContain("await requireCreator()");
    expect(source).not.toMatch(/creatorId\s*:\s*(request|input|body|params)/);
  });
});
