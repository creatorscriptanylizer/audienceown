import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyRecoveryPassSlugEdit, canSubmitCreatorForm, localSlugAvailability } from "@/lib/creator-profile";
import { displayRecoveryPassUrl } from "@/lib/recovery-pass";

const source=(path:string)=>readFileSync(path,"utf8");

describe("Stage 12.3 empty first-time Recovery Pass",()=>{
  it("creates new creator rows without generating or reserving a slug",()=>{
    const migration=source("supabase/migrations/20260904000000_unset_recovery_pass_until_chosen.sql");
    expect(migration).toContain("alter column public_slug drop not null");
    expect(migration).toContain("values(new.id,coalesce");
    expect(migration).toContain(",null)");
    expect(migration).not.toContain("candidate :=");
  });
  it("starts idle and does not request availability for an empty value",()=>{
    expect(localSlugAvailability("",null)).toEqual({status:"idle"});
    const component=source("components/recovery-pass-setup.tsx");
    expect(component).toContain('if (current.status !== "checking") return');
    expect(component).toContain('placeholder="yourname"');
  });
  it("never turns placeholder copy into submitted form state",()=>{
    expect(applyRecoveryPassSlugEdit("")).toEqual({slug:"",manuallyEdited:true});
    expect(source("components/recovery-pass-setup.tsx")).toContain('value={slugState.slug} placeholder="yourname"');
  });
  it("normalizes a typed choice and enables only real availability",()=>{
    expect(applyRecoveryPassSlugEdit(" Nana_Name ").slug).toBe("nana-name");
    expect(canSubmitCreatorForm({status:"idle"})).toBe(false);
    expect(canSubmitCreatorForm({status:"available"})).toBe(true);
  });
  it("uses a neutral canonical preview until a real choice is typed",()=>{
    expect(displayRecoveryPassUrl("http://localhost:3000","your-name")).toBe("audienceown.com/your-name");
    const component=source("components/recovery-pass-setup.tsx");
    expect(component).toContain('const previewSlug = slugState.slug || "your-name"');
    expect(component).toContain("Choose a name to preview your Recovery Pass.");
  });
  it("preserves existing and partial saved slugs",()=>{
    const page=source("app/onboarding/recovery-pass/page.tsx");
    expect(page).toContain('initialSlug={creator.public_slug??""}');
    expect(source("supabase/migrations/20260904000000_unset_recovery_pass_until_chosen.sql")).not.toMatch(/update public\.creators set public_slug=null/i);
  });
  it("persists the exact chosen slug through the owner-constrained action",()=>{
    const action=source("app/onboarding/actions.ts");
    expect(action).toContain("p_slug: parsed.data.public_slug");
    expect(source("supabase/migrations/20260906000000_atomic_recovery_pass_creation.sql")).toContain("where owner_user_id=auth.uid()");
  });
});
