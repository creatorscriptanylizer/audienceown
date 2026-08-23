import fs from "node:fs";
import path from "node:path";
import { describe,expect,it } from "vitest";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");

describe("Emergency zero-audience final confirmation",()=>{
  const actions=read("app/dashboard/updates/actions.ts");
  const studio=read("components/broadcast-studio/broadcast-studio.tsx");
  const delivery=read("lib/update-delivery.ts");

  it("returns an intent-bound structured completion result",()=>{
    expect(actions).toContain('kind: "zero_audience"');
    expect(actions).toContain('intent: values.broadcast_intent');
    expect(actions).toContain('"No eligible followers to alert yet"');
    expect(actions).toContain("No opted-in followers from the selected accounts are currently eligible");
    expect(actions).toContain("Your draft is saved and nothing was sent.");
  });

  it("re-resolves before queuing and stops before the queue RPC when empty",()=>{
    expect(delivery.indexOf("getEligibleRecipientsForUpdate(updateId, creatorId)")).toBeLessThan(delivery.indexOf('supabase.rpc("publish_update_delivery_queue"'));
    expect(delivery).toContain('throw new PublicationError("zero_audience")');
  });

  it("shows a live result and removes the send action",()=>{
    expect(studio).toContain('role="status" aria-live="polite"');
    expect(studio).toContain('result?.kind === "zero_audience"');
    expect(studio).toContain("finalResultVisible ? <>");
    expect(studio).toContain("Back to draft");
    expect(studio).toContain("View Recovery Pass");
  });

  it("disables duplicate submission and exposes an Emergency-specific pending label",()=>{
    expect(studio).toContain('disabled={committing}');
    expect(studio).toContain('"Sending emergency alert…"');
  });
});
