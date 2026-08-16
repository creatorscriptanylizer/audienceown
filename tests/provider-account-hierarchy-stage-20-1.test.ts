import{readFileSync}from"node:fs";
import{describe,expect,it}from"vitest";

const migration=readFileSync("supabase/migrations/20260913000000_provider_account_hierarchy_invariant.sql","utf8");
const activeMigration=readFileSync("supabase/migrations/20260913000001_active_provider_account_hierarchy.sql","utf8");
const manager=readFileSync("components/platforms-manager.tsx","utf8");
const genericCallback=readFileSync("app/api/integrations/[provider]/callback/route.ts","utf8");
const metaCallback=readFileSync("app/api/integrations/meta/callback/route.ts","utf8");

describe("permanent provider account hierarchy",()=>{
  it("enforces one official per creator/provider at the database boundary",()=>{
    expect(migration).toContain("connected_accounts_one_official_per_provider");
    expect(migration).toContain("where account_type = 'official'");
    expect(migration).toContain("only one official account is allowed per creator/provider");
  });
  it("serializes and reconciles every insert, role change, provider move, and delete",()=>{
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("after insert or delete or update of creator_id, platform, account_type, protected_official_account_id");
    expect(migration).toContain("protected_official_account_id = official_id");
  });
  it("releases the canonical slot and reconciles when an official is revoked",()=>{
    expect(activeMigration).toContain("connection_health not in ('revoked','expired')");
    expect(activeMigration).toContain("update of account_type, creator_id, platform, protected_official_account_id, connection_health, provider_status");
  });
  it("keeps the hierarchy persistent and independent of sessions and OAuth state",()=>{
    expect(migration).not.toMatch(/auth\.uid|cookie|session|oauth/i);
    expect(genericCallback).not.toContain('state.role==="backup"&&!state.protectedOfficialAccountId');
    expect(metaCallback).not.toContain('state.role==="backup"&&!state.protectedOfficialAccountId');
  });
  it("allows a backup-first flow without asking the user to select a canonical official",()=>{
    expect(manager).not.toContain("Official account this backup protects");
    expect(manager).not.toContain("Select official account");
  });
});
