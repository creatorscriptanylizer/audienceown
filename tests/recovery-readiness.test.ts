import { describe, expect, it } from "vitest";
import { calculateRecoveryReadiness, recoveryReadinessState } from "@/lib/recovery-readiness";
import { getCreatorInsight } from "@/lib/dashboard/creator-insights";
import type { CreatorDashboardData } from "@/lib/dashboard/creator-dashboard";

const statuses = (completed:number) => ({
  page:completed>0?"complete":"incomplete",
  pass:completed>1?"complete":"incomplete",
  official:completed>2?"complete":"incomplete",
  backup:completed>3?"complete":"incomplete",
  plan:completed>4?"complete":"incomplete",
} as const);

function insightData(score:number|null):CreatorDashboardData {
  return {calculatedAt:"2026-08-15T12:00:00Z",creator:{displayName:"Creator",handle:"creator"},availability:{recoveryAudience:{status:"available"},recoveryDestinations:{status:"available"},audienceUpdates:{status:"available"}},recoveryPass:{exists:true,active:true,canonicalUrl:"https://example.com/creator",displayUrl:"example.com/creator",href:"/creator"},recoveryAudience:{protectedAudience:2,recoveryConnections:2,recoveryDestinations:1,growth:{range:"30d",historySource:"recovery_pass_destination_selected_at",points:[]}},recoveryAudienceRanges:undefined,audienceUpdates:{periodDays:30,updatesSent:0,audienceReached:0,openRate:null,clickRate:null,drafts:0,scheduled:0,nextScheduled:null,recent:[],byPlatform:[]},audience:{protectedFans:2,fansAtRisk:0,protectedRatio:null,trend:[]},recoveryReadiness:{availability:score===null?"unavailable":"available",score,state:score===null?"Readiness unavailable":recoveryReadinessState(score),checklist:calculateRecoveryReadiness(score===null?{...statuses(4),plan:"unavailable"}:statuses(Math.round(score/20))).checklist},recoveryDestinations:[],dashboardAccounts:[],nativeOfficialAudience:0,nativeOfficialAudienceAccountCount:0,connectedProviders:[],availableProviders:[],protection:{},platforms:[],identity:{},ecosystem:{},emergency:{},liveRecovery:null,nextAction:{}} as unknown as CreatorDashboardData;
}

describe("authoritative Recovery Readiness",()=>{
  it.each([[0,0,"Not configured"],[1,20,"Getting started"],[2,40,"Partially ready"],[3,60,"Partially ready"],[4,80,"Almost ready"],[5,100,"Recovery ready"]] as const)("maps %i of five checks to %i%% and %s",(complete,score,state)=>expect(calculateRecoveryReadiness(statuses(complete))).toMatchObject({availability:"available",score,state}));
  it("never lets a ready prepared-plan label override a partial checklist",()=>{const result=calculateRecoveryReadiness({page:"complete",pass:"complete",official:"incomplete",backup:"incomplete",plan:"complete"});expect(result).toMatchObject({score:60,state:"Partially ready"});expect(result.state).not.toMatch(/^ready$/i);});
  it("treats a non-ready plan as one incomplete setup check",()=>expect(calculateRecoveryReadiness({page:"complete",pass:"complete",official:"complete",backup:"complete",plan:"incomplete"})).toMatchObject({score:80,state:"Almost ready"}));
  it("returns no percentage when any required source is unavailable",()=>expect(calculateRecoveryReadiness({...statuses(4),plan:"unavailable"})).toMatchObject({availability:"unavailable",score:null,state:"Readiness unavailable"}));
  it("reserves 100% and Recovery ready for all five verified checks",()=>expect(calculateRecoveryReadiness(statuses(5))).toMatchObject({score:100,state:"Recovery ready"}));
  it("uses verified readiness facts for insight thresholds",()=>{expect(getCreatorInsight(insightData(79)).id).not.toBe("recovery-almost-ready");expect(getCreatorInsight(insightData(80)).id).toBe("recovery-almost-ready");expect(getCreatorInsight(insightData(100)).id).toBe("recovery-ready");expect(getCreatorInsight(insightData(null)).category).not.toBe("readiness");});
  it("does not change when native audience context changes",()=>{const data=insightData(80),before=getCreatorInsight(data);data.nativeOfficialAudience=9_999_999;expect(getCreatorInsight(data)).toEqual(before);});
});
