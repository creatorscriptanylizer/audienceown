import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
import { buildAudienceDashboard } from "@/lib/audience-dashboard";

describe("multi-source protected followers",()=>{
  it("counts two canonical people across three attributed accounts",()=>{
    const base={status:"active",activated_at:"2026-08-10T00:00:00Z",consented_at:"2026-08-10T00:00:00Z",deactivated_at:null,unsubscribed_at:null,source_platform:"direct"};
    const data=buildAudienceDashboard({connections:[{...base,id:"a",follower_contact_id:"person-a"},{...base,id:"b",follower_contact_id:"person-b"}],methods:[],categories:[],legacyPreferences:[],accounts:[{id:"main",platform:"youtube",account_type:"official",label:"KwaMoon",external_account_name:"KwaMoon"},{id:"recovery-a",platform:"instagram",account_type:"backup",label:"nana_friggy",external_account_name:"nana_friggy"},{id:"recovery-b",platform:"youtube",account_type:"backup",label:"Lineconomy",external_account_name:"Lineconomy"}],memberships:[{follower_connection_id:"a",connected_account_id:"main"},{follower_connection_id:"a",connected_account_id:"recovery-a"},{follower_connection_id:"b",connected_account_id:"recovery-b"}]},{page:1,pageSize:20,query:"",filter:"all",range:"30d",now:new Date("2026-08-19T00:00:00Z")});
    expect(data.summary.protectedFollowers).toBe(2);
    expect(Object.fromEntries(data.sources.map(item=>[item.displayName,item.protectedFollowerCount]))).toEqual({KwaMoon:1,nana_friggy:1,Lineconomy:1});
    expect(data.followers.rows.find(row=>row.id==="person-a")?.sources).toHaveLength(2);
  });

  it("renders a primary source plus the remaining source count",()=>{const page=readFileSync("app/dashboard/audience/page.tsx","utf8");expect(page).toContain("row.sources[0]");expect(page).toContain("row.sources.length-1");expect(page).toContain(" more</small>");});

  it("does not query the intentionally restricted follower contact table",()=>{const service=readFileSync("lib/audience-dashboard.ts","utf8");expect(service).not.toContain('from("follower_contacts")');expect(service).toContain('destination_masked');});
});
