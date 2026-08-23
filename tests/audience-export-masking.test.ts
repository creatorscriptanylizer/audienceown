import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
import { buildAudienceExportCsv } from "@/lib/audience-export";

describe("protected audience export",()=>{
  it("emits one safe masked row for duplicate canonical relationships",()=>{
    const connections=[{id:"join-a",follower_contact_id:"internal-person-id",consented_at:"2026-08-01T00:00:00Z",activated_at:"2026-08-02T00:00:00Z",source_platform:"youtube"},{id:"join-b",follower_contact_id:"internal-person-id",consented_at:"2026-08-03T00:00:00Z",activated_at:"2026-08-03T00:00:00Z",source_platform:"instagram"}];
    const csv=buildAudienceExportCsv(connections,[{id:"internal-person-id",email_masked:"k••••@example.com",phone_masked:"+49 ••• ••90"}],[{follower_connection_id:"join-a",important_account_updates:true,new_content:true,creator_announcements:false}]);
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("k••••@example.com");expect(csv).toContain("+49 ••• ••90");
    for(const secret of["kwame@example.com","+491234567890","internal-person-id","join-a","auth-user-id","preference_token","private_metadata"])expect(csv).not.toContain(secret);
  });

  it("accepts masked contact fields only",()=>{const serializer=readFileSync("lib/audience-export.ts","utf8");expect(serializer).toContain("email_masked:string|null");expect(serializer).toContain("phone_masked:string|null");expect(serializer).not.toMatch(/email_ciphertext|phone_ciphertext|email_hash|phone_hash|token/);});

  it("scopes the route to the authenticated creator and active relationships before serialization",()=>{const route=readFileSync("app/api/audience/export/route.ts","utf8");expect(route).toContain('.eq("owner_user_id",user.id)');expect(route).toContain('.eq("creator_id",creator.id).eq("status","active")');expect(route).toContain('select("id,email_masked,phone_masked")');expect(route).toContain("buildAudienceExportCsv(connections??[],contacts??[],prefs??[])");expect(route).not.toMatch(/email_ciphertext|phone_ciphertext|preference_token_hash|unsubscribe_token_hash/);});
});
