import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const actions=readFileSync("app/dashboard/updates/actions.ts","utf8");
const detail=readFileSync("app/dashboard/updates/[id]/page.tsx","utf8");
const activity=readFileSync("components/updates-activity-command-center.tsx","utf8");

describe("update management security contract",()=>{
 it("enforces creator ownership and draft state on lookup and deletion",()=>{const segment=actions.slice(actions.indexOf("export async function deleteDraft"),actions.indexOf("async function commitPublication"));expect(segment).toContain("requireCreator()");expect(segment).toContain('.eq("creator_id",creator.id)');expect(segment).toContain('.eq("status","draft")');expect(segment).toContain('from("update_deliveries")');expect(segment).toContain('from("creator_emergencies")');expect(segment).toContain('from("imported_social_content")')});
 it("keeps private detail reads creator-owned to prevent IDOR",()=>{expect(detail).toContain('.eq("id", id).eq("creator_id", creator.id).maybeSingle()')});
 it("uses the existing cancellation RPC with creator ownership",()=>{const segment=actions.slice(actions.indexOf("export async function cancelScheduledUpdate"));expect(segment).toContain('rpc("cancel_scheduled_update"');expect(segment).toContain("p_creator_id: creator.id")});
 it("requires explicit creator confirmation and never exposes autonomous destructive AI actions",()=>{expect(activity).toContain('role="alertdialog"');expect(activity).toContain("Delete This Update?");expect(activity).toContain("Cancel This Scheduled Update?");expect(activity).not.toContain("DELETE_SENT_UPDATE");expect(activity).not.toContain("autoRetry")});
});
