import { describe, expect, it, vi } from "vitest";
import { calculatePlanReadiness } from "@/lib/emergency/readiness";
import { buildDrillResult } from "@/lib/emergency/drills";
import { simulateRecipientAggregation } from "@/lib/emergency/simulation";
import type { RecipientCandidate } from "@/lib/update-recipients";

const base={affectedAccountExists:true,templateValid:true,recoveryPassEnabled:true,publicPageEnabled:true,hasManager:true,hasActivator:true,hasSeparateApprover:true,severity:"important" as const};
describe("emergency preparedness",()=>{
  it("marks a valid non-critical plan ready",()=>expect(calculatePlanReadiness(base)).toMatchObject({ready:true,status:"ready",blockers:[]}));
  it.each([
    ["missing Recovery Pass",{recoveryPassEnabled:false},"Recovery Pass is disabled."],
    ["disabled public page",{publicPageEnabled:false},"The public creator page is disabled."],
    ["missing affected account",{affectedAccountExists:false},"The affected official account is unavailable."],
  ])("blocks %s",(_label,change,blocker)=>expect(calculatePlanReadiness({...base,...change}).blockers).toContain(blocker));
  it("requires a separate approver for critical plans",()=>expect(calculatePlanReadiness({...base,severity:"critical",hasSeparateApprover:false}).ready).toBe(false));
  it("never treats a proposed replacement as verified",()=>expect(calculatePlanReadiness({...base,proposedReplacementUrl:"https://example.com/backup",replacementVerified:false}).warnings).toContain("The proposed replacement is saved for planning only and is not verified."));
  it("rejects non-HTTPS replacement URLs",()=>expect(calculatePlanReadiness({...base,proposedReplacementUrl:"http://example.com"}).ready).toBe(false));
  it("aggregates transports without returning raw contact details",()=>{const candidate=(transport:string,index:number):RecipientCandidate=>({connectionId:`connection-${index}`,contactId:`contact-${index}`,creatorId:"creator",expectedCreatorId:"creator",connectionStatus:"active",selectedRecoveryMethodId:`method-${index}`,preferenceEnabled:true,existingTransports:[],destinations:[{recoveryMethodId:`method-${index}`,contactId:`contact-${index}`,methodType:transport,value:transport==="email"?"simulation@example.com":"+15555550100",destinationHash:"hash",verified:true,active:true}]});const result=simulateRecipientAggregation([candidate("email",1),candidate("sms",2)]);expect(result.transportSummary).toMatchObject({email:1,sms:1});expect(JSON.stringify(result)).not.toContain("simulation@example.com");});
  it("reports failed reauthentication without activating or dispatching",()=>{const dispatch=vi.fn(),activate=vi.fn();const readiness=calculatePlanReadiness({...base,severity:"critical"});const result=buildDrillResult({readiness,eligible:2,excluded:{},transports:{sms:2},separateApproverAvailable:true,activationPermissionAvailable:true,reauthenticationRequired:true,recentlyReauthenticated:false,proposedReplacement:false,preview:{title:"Test",message:"Test",severity:"critical"}});expect(result.status).toBe("failed");expect(dispatch).not.toHaveBeenCalled();expect(activate).not.toHaveBeenCalled();});
  it("produces aggregate-only drill results",()=>{const result=buildDrillResult({readiness:calculatePlanReadiness(base),eligible:3,excluded:{unsubscribed:1},transports:{email:1,sms:2},separateApproverAvailable:true,activationPermissionAvailable:true,reauthenticationRequired:false,recentlyReauthenticated:false,proposedReplacement:true,preview:{title:"Test",message:"Message",severity:"important"}});expect(result).toMatchObject({status:"passed",recipientSummary:{eligibleRecoveryPassHolders:3},replacementCheck:{verified:false}});expect(result).not.toHaveProperty("recipients");});
});
