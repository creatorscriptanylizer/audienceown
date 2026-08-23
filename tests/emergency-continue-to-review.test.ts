import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const studio=readFileSync("components/broadcast-studio/broadcast-studio.tsx","utf8");
const actions=readFileSync("app/dashboard/updates/actions.ts","utf8");

describe("Emergency Continue to review contract",()=>{
  it("uses the canonical form action and native submit intent",()=>{
    expect(studio).toContain('<form id="broadcast-form" action={saveAction} onSubmit=');
    expect(studio).toContain('type="submit" name="continue_to_review" value="true"');
    expect(actions).toContain('data.get("continue_to_review") === "true"');
  });
  it("does not silently disable review for incomplete client state",()=>{
    expect(studio).toContain("const reviewDisabled = savePending;");
    expect(studio).toContain("Incomplete fields will be explained after submission");
    expect(studio).toContain('state.error && <p role="alert"');
  });
  it("keeps communication intent separate from situation",()=>{
    expect(studio).toContain('onClick={() => change(() => setRecoverySituation(item.key))}');
    expect(studio).not.toContain('setRecoverySituation(item.key);setIntent(item.intent)');
    expect(studio).toContain('<input type="hidden" name="broadcast_intent" value={intent}/>');
    expect(studio).toContain('<input type="hidden" name="recovery_situation" value={recoverySituation}/>');
  });
  it("prevents duplicate logical review submissions and exposes pending state",()=>{
    expect(studio).toContain("if (reviewSubmissionRef.current)");
    expect(studio).toContain('submissionMode === "review" && savePending ? "Preparing review…"');
    expect(studio).toContain("if (saveState.error)");
    expect(studio).toContain("reviewSubmissionRef.current = false");
  });
  it("preserves every Recovery destination through the review submission",()=>{
    expect(studio).toContain('selectedRecoveryIds.map((id) => <input key={id} type="hidden" name="selected_recovery_account_ids" value={id}/>)');
    expect(actions).toContain("p_destination_ids:values.selected_recovery_account_ids");
  });
  it("uses atomic create/update and the canonical persisted review route",()=>{
    expect(actions).toContain('admin.rpc("create_recovery_communication_draft"');
    expect(actions).toContain('admin.rpc("update_recovery_communication_draft"');
    expect(actions).toContain('redirect(`/dashboard/updates/${updateId}${continueToReview?"?review=1":""}`)');
    expect(actions).toContain('redirect(`/dashboard/updates/${id}${continueToReview?"?review=1":""}`)');
  });
  it("logs the safe Recovery review lifecycle",()=>{
    for(const event of ["recovery_continue_to_review_started","recovery_draft_validation_passed","recovery_draft_saved_for_review","recovery_review_navigation_ready"])expect(actions).toContain(event);
    expect(actions).toContain("destinationCount:values.selected_recovery_account_ids.length");
  });
  it("keeps audience preview independent from form submission and zero audience",()=>{
    expect(studio).toContain('previewCommunicationAudience(intent, scopedAccountIds)');
    expect(studio).not.toMatch(/reviewDisabled\s*=.*audience/i);
    expect(actions).toContain('redirect(`/dashboard/updates/${updateId}');
  });
  it("keeps Save draft as the same form action without review intent",()=>{
    expect(studio).toContain('<button type="submit" className={`button ${update ? "button-secondary" : "button-primary"}`}');
    expect(studio.match(/name="continue_to_review"/g)).toHaveLength(1);
  });
});
