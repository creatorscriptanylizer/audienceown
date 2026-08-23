import{readFileSync}from"node:fs";
import{describe,expect,it}from"vitest";

const source=(path:string)=>readFileSync(path,"utf8");
const action=source("app/actions/recovery-account.ts");
const manager=source("components/recovery-network-manager.tsx");
const removal=source("lib/connected-account-removal.ts");
const relationshipMigration=source("supabase/migrations/20260919000000_main_account_recovery_destinations.sql");
const historyMigration=source("supabase/migrations/20260829000000_detach_connected_account_history.sql");
const entitlementMigration=source("supabase/migrations/20260831000000_provider_connection_entitlements.sql");

describe("Recovery account deletion management",()=>{
  it("replaces only per-Recovery Manage with a labeled destructive action",()=>{
    expect(manager).toContain("Delete Recovery account ${r.platform} · ${r.label}");
    expect(manager).toContain("<Trash2/> Delete</button>");
    expect(manager).not.toContain("aria-label={`Manage ${recovery.label}");
    expect(manager).toContain("Delete Main account");
    expect(manager).toContain("removeMainAccount(deletingMain.account.id)");
    expect(manager).toContain("Add another Recovery account");
  });

  it("uses an accessible confirmation with shared-network impact and safe cancellation",()=>{
    for(const contract of ['role="dialog"','aria-modal="true"','e.key==="Escape"',"deleteReturn.current?.focus()","Delete account","Cancel"])expect(manager).toContain(contract);
    expect(manager).toContain("removed from every Recovery Network");
    expect(manager).toContain("if(!deleting||deletePending||deleteInFlight.current)return");
    expect(manager).toContain('disabled={deletePending} onClick={confirmDelete}');
  });

  it("authorizes the exact creator-owned Recovery role and rejects Main or foreign IDs",()=>{
    expect(action).toContain('.eq("id",parsed.data).eq("creator_id",creator.id).eq("account_type","backup")');
    expect(action).toContain("if(owned.error||!owned.data){logRecoveryDeleteFailure");
    expect(action).toContain('const failure="Unable to delete Recovery account. Try again."');
  });

  it("reuses canonical cleanup and cascades every shared relationship",()=>{
    expect(action).toContain("removeCreatorConnectedAccount(admin,creator.id,owned.data.id)");
    expect(removal).toContain('from("platform_connection_secrets").delete()');
    expect(removal).toContain('from("connected_accounts").delete()');
    expect(relationshipMigration.match(/references public\.connected_accounts\(id\) on delete cascade/g)).toHaveLength(2);
    expect(action).toContain('recovery_connected_account_id",owned.data.id');
  });

  it("does not let remote provider revocation block secure local deletion",()=>{
    expect(action).toContain('stage="provider_revocation"');
    expect(action).toContain("try{await revokeProviderConnection");
    expect(action).toContain("logRecoveryDeleteFailure({stage,provider,relationshipCount,error})");
    expect(action.indexOf("try{await revokeProviderConnection")).toBeLessThan(action.indexOf("removeCreatorConnectedAccount(admin,creator.id,owned.data.id)"));
  });

  it("emits structured, secret-free failure diagnostics",()=>{
    for(const field of ['event:"recovery_account_delete_failed"',"safe_error_code","constraint",'account_role:"backup"',"relationship_count"])expect(action).toContain(field);
    expect(action).not.toContain("access_token_ciphertext,provider");
  });

  it("preserves operational history and releases the canonical entitlement slot",()=>{
    expect(historyMigration.match(/on delete set null/g)).toHaveLength(3);
    expect(historyMigration).toContain("creator_updates_affected_platform_connection_id_fkey");
    expect(historyMigration).toContain("emergency_affected_accounts_connected_account_id_fkey");
    expect(entitlementMigration).toContain("from public.connected_accounts");
    expect(entitlementMigration).toContain("a.account_type = p_role");
  });

  it("revalidates every account surface only after canonical deletion succeeds",()=>{
    expect(action.indexOf('result.status!=="disconnected"')).toBeLessThan(action.indexOf("revalidateCreatorAccounts(creator.id)"));
    expect(action).toContain('revalidatePath("/dashboard/emergency")');
    expect(manager).toContain("router.refresh()");
    expect(manager).toContain('role="status"');
    expect(manager).toContain("Recovery account deleted");
  });
});
