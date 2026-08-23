import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BroadcastStudio } from "@/components/broadcast-studio/broadcast-studio";

const source = (path: string) => readFileSync(path, "utf8");

describe("Updates route availability contract", () => {
  const root = source("app/dashboard/updates/page.tsx");
  const detail = source("app/dashboard/updates/[id]/page.tsx");
  const preview = source("app/dashboard/updates/[id]/preview/page.tsx");
  const create = source("app/dashboard/updates/new/page.tsx");

  it("keeps successful empty activity distinct from root-query failures", () => {
    expect(root).toContain("const available=!updatesResult.error&&!accountsResult.error&&!emergenciesResult.error");
    expect(root).toContain("available={false}");
    const commandCenter=source("components/updates-activity-command-center.tsx");
    expect(commandCenter).toContain("Your first update starts here.");
    expect(commandCenter).toContain("Activity history is unavailable");
    for (const filter of ["updates","emergency","account","scheduled","failed"]) expect(commandCenter).toContain(`\"${filter}\"`);
  });

  it("does not turn a delivery failure into zero recipients", () => {
    expect(root).toContain("deliveries:deliveriesResult.error?[]:");
    expect(source("lib/updates-activity.ts")).toContain("recipientCount:deliveries.length?");
    expect(detail).toContain('title="Delivery data unavailable"');
    expect(detail).toContain("deliveriesResult.error ? <>— recipient notifications prepared.");
    expect(detail).not.toContain("deliveries?.length ?? 0");
  });

  it("distinguishes unavailable connected accounts from a successful empty list", () => {
    expect(create).toContain("accountsAvailable={!accountsResult.error}");
    expect(detail).toContain("accountsAvailable={!accountsResult.error}");
    const update = {id:"update-1",broadcast_type:"account_update" as const,broadcast_intent:"account_hacked" as const,affected_platform_connection_id:null,status:"draft" as const,title:"Title",subject:"Subject",preview_text:"",content:"Body",cta_label:null,cta_url:null,scheduled_for:null};
    const unavailable = renderToStaticMarkup(<BroadcastStudio update={update} creator={{displayName:"Creator",publicSlug:"creator"}} accounts={[]} accountsAvailable={false} estimate={null}/>);
    const empty = renderToStaticMarkup(<BroadcastStudio update={update} creator={{displayName:"Creator",publicSlug:"creator"}} accounts={[]} accountsAvailable estimate={null}/>);
    expect(unavailable).toContain("Connected accounts unavailable");
    expect(unavailable).not.toContain("No Main accounts connected");
    expect(empty).toContain("No Main accounts connected");
    expect(empty).not.toContain("Connected accounts unavailable");
  });

  it("keeps detail lookup failure separate from genuine not found", () => {
    expect(detail).toContain("if (updateResult.error)");
    expect(detail.indexOf("if (updateResult.error)")).toBeLessThan(detail.indexOf("if (!update) notFound()"));
    expect(detail).toContain('title="Update unavailable"');
    expect(detail).toContain("if (!update) notFound()");
  });

  it("keeps secondary detail failures isolated", () => {
    for (const query of ["connected_accounts", "publishing_accounts", "update_deliveries", "ai_draft_enhancement_jobs", "ai_draft_variants"]) expect(detail).toContain(`["${query}"`);
    expect(detail).toContain('title="AI draft history unavailable"');
    expect(detail).not.toContain("getEligibleRecipientsForUpdate");
    expect(detail).toContain("account_display_snapshot");
    expect(detail).toContain("Audience calculation unavailable");
  });

  it("distinguishes preview lookup failure from genuine absence", () => {
    expect(preview).toContain("if (error)");
    expect(preview.indexOf("if (error)")).toBeLessThan(preview.indexOf("if (!update) notFound()"));
    expect(preview).toContain('title="Preview unavailable"');
  });

  it("preserves creator scoping and browser/RLS reads", () => {
    for (const page of [root, detail, preview, create]) expect(page).toContain("requireCreator()");
    expect(root).toContain('.eq("creator_id",creator.id)');
    expect(detail).toContain('.eq("creator_id", creator.id)');
    expect(preview).toContain('.eq("creator_id", creator.id)');
    expect(create).toContain('.eq("creator_id", creator.id)');
    for (const page of [root, detail, preview, create]) expect(page).not.toContain("createAdminClient");
  });
});
