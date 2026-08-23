import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),"utf8");

describe("account-scoped Emergency audiences",()=>{
  const resolver=read("lib/communication-audience.ts");
  const delivery=read("lib/update-delivery.ts");
  const studio=read("components/broadcast-studio/broadcast-studio.tsx");
  const migration=read("supabase/migrations/20260926000000_emergency_account_scoped_audiences.sql");

  it("uses canonical Main and Recovery opt-in relationships, never native metrics",()=>{
    expect(resolver).toContain('from("follower_connection_account_memberships")');
    expect(resolver).toContain('from("follower_recovery_destination_preferences")');
    expect(resolver).not.toContain("provider_audience_metrics");
  });

  it("deduplicates by canonical follower contact and reports verified channels",()=>{
    expect(resolver).toContain("eligibleContactIds.has(connection.follower_contact_id)");
    expect(resolver).toContain("channelBreakdown[transport]+=1");
    expect(resolver).toContain('method.method_status!=="verified"');
  });

  it("re-resolves persisted selected accounts before delivery",()=>{
    expect(delivery).toContain('from("creator_update_recovery_destinations")');
    expect(delivery).toContain("resolveCommunicationAudiencePreview(creatorId, update.broadcast_intent");
    expect(migration).toContain("recipient is outside selected Emergency account opt-ins");
  });

  it("shows per-account counts, unique audience, channels, and overlap guidance",()=>{
    expect(studio).toContain("Your emergency audience");
    expect(studio).toContain("optedInFollowerCount.toLocaleString()");
    expect(studio).toContain("unique eligible followers");
    expect(studio).toContain("automatically removes duplicates before sending");
    expect(studio).toContain("Delivery preferences");
  });

  it("recalculates when either Main or Recovery selection changes",()=>{
    expect(studio).toContain("[platformId, ...selectedRecoveryIds].filter(Boolean)");
    expect(studio).toContain("platformId, selectedAccountIds, selectedRecoveryIds");
  });
});
