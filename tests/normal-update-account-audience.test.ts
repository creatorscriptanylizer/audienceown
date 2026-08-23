import fs from "node:fs";
import path from "node:path";
import { describe,expect,it } from "vitest";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");

describe("normal Update account-scoped audience summaries",()=>{
  const audience=read("lib/communication-audience.ts");
  const newVideo=read("lib/new-video-targeting.ts");
  const delivery=read("lib/update-delivery.ts");
  const studio=read("components/broadcast-studio/broadcast-studio.tsx");
  const definitions=read("lib/broadcast-studio.ts");

  it("uses one shared account aggregation service for every normal intent",()=>{
    expect(newVideo).toContain('resolveCommunicationAudiencePreview(creatorId, "new_video", uniqueIds)');
    expect(delivery).toContain("resolveCommunicationAudiencePreview(creatorId, update.broadcast_intent");
    expect(audience).toContain('definition.category');
  });

  it("intersects Main and Recovery account pools with category consent",()=>{
    expect(audience).toContain('from("follower_connection_account_memberships")');
    expect(audience).toContain('from("follower_recovery_destination_preferences")');
    expect(audience).toContain("scopedConnections.has(connection.id)");
    expect(audience).not.toContain("provider_audience_metrics");
  });

  it("deduplicates canonical contacts and reports verified email delivery",()=>{
    expect(audience).toContain("eligibleContactIds.has(connection.follower_contact_id)");
    expect(audience).toContain('eq("method_type","email").eq("method_status","verified")');
    expect(audience).toContain("email:eligibleContactIds.size");
  });

  it("retains canonical intent mappings",()=>{
    for(const mapping of ['intent: "new_video"','intent: "livestream"','intent: "podcast_episode"','intent: "product_release"','intent: "event"','intent: "general_announcement"','intent: "community_update"'])expect(definitions).toContain(mapping);
    expect(definitions).toContain('intent: "podcast_episode", group: "share"');
    expect(definitions).toContain('category: "videos"');
  });

  it("shows per-account counts, unique totals, overlap guidance and normal email-only truth",()=>{
    expect(studio).toContain("Per-account eligibility");
    expect(studio).toContain("opted in to {audienceCopy.preferenceLabel}");
    expect(studio).toContain("unique eligible followers");
    expect(studio).toContain("automatically removes duplicates before sending");
    expect(studio).toContain("Normal Updates currently deliver through verified email only.");
  });
});
