import{readFileSync}from"node:fs";
import{describe,expect,it}from"vitest";

const manager=readFileSync("components/platforms-manager.tsx","utf8");
const action=readFileSync("app/actions/creator.ts","utf8");
const compact=(value:string)=>value.replace(/\s+/g,"");

describe("Configure accounts post-save navigation",()=>{
  it("navigates to the main dashboard only from the confirmed success state",()=>{
    expect(manager).toContain('if(!state.savedAccounts||handledSuccessfulSave.current)return');
    expect(manager).toContain('router.push("/dashboard")');
    expect(manager).not.toContain('window.location.href');
  });

  it("does not navigate from submit, validation, persistence failure, or cancel",()=>{
    const successEffect=manager.indexOf('if(!state.savedAccounts||handledSuccessfulSave.current)return');
    expect(successEffect).toBeGreaterThan(-1);
    expect(manager.slice(manager.indexOf("<form action={action}"),successEffect)).not.toContain("router.push");
    expect(manager).not.toContain("onSubmit={()=>setDirty(false)}");
    expect(manager).toContain('<button type="button" className="button button-secondary" onClick={closeModal}>Close</button>');
  });

  it("prevents duplicate submissions and duplicate success navigation",()=>{
    expect(manager).toContain('dirty&&<form action={action}>');
    expect(manager).toContain('<button className="button button-primary" disabled={pending}>');
    expect(manager).toContain('handledSuccessfulSave.current=true');
  });

  it("invalidates dashboard data before the action exposes success",()=>{
    const normalized=compact(action);
    const invalidation=normalized.lastIndexOf(compact("revalidateCreatorAccounts(creator.id)"));
    const success=normalized.lastIndexOf(compact('return { success: "Account changes saved."'));
    expect(invalidation).toBeGreaterThan(-1);
    expect(success).toBeGreaterThan(invalidation);
  });

  it("keeps hierarchy and acquisition provenance in the save payload",()=>{
    expect(action).toContain("protected_official_account_id");
    expect(action).not.toContain("external_account_id: null");
    expect(manager).toContain("externalAccountId:account.external_account_id");
  });
});
