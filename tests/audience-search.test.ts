import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
import { buildAudienceDashboard } from "@/lib/audience-dashboard";

const personId="person-don",masked="d•••••@yahoo.com";
const rows={connections:[{id:"connection",follower_contact_id:personId,status:"active",activated_at:"2026-08-20T00:00:00Z",consented_at:"2026-08-20T00:00:00Z",deactivated_at:null,unsubscribed_at:null,source_platform:"direct"}],methods:[{follower_contact_id:personId,method_type:"email",method_status:"verified",destination_masked:masked,consent_revoked_at:null,opted_out_at:null}],categories:[{follower_connection_id:"connection",category_key:"videos",enabled:true}],legacyPreferences:[],memberships:[{follower_connection_id:"connection",connected_account_id:"account"}],accounts:[{id:"account",platform:"youtube",account_type:"official",label:"KwaMoon",external_account_name:"KwaMoon"}]};
const options=(query:string,privateMatch=false,filter="all" as const)=>({page:1,pageSize:20,query,filter,range:"30d" as const,now:new Date("2026-08-21T00:00:00Z"),privateMatchPersonIds:privateMatch?new Set([personId]):new Set<string>()});

describe("privacy-safe Audience search",()=>{
  it("proves an unmasked local part cannot match the masked display alone",()=>{expect(buildAudienceDashboard(rows,options("donfriggy")).followers.total).toBe(0);});
  it.each(["donfriggy","donfriggy@yahoo.com"])("matches %s through a creator-scoped private match while returning only the mask",query=>{const result=buildAudienceDashboard(rows,options(query,true));expect(result.followers.total).toBe(1);expect(result.followers.rows[0].identity).toBe(masked);expect(JSON.stringify(result)).not.toContain("donfriggy@yahoo.com");});
  it("combines local-part search and Video updates atomically",()=>{expect(buildAudienceDashboard(rows,{...options("donfriggy",true),filter:"videos"})).toMatchObject({followers:{total:1}});});
  it("returns zero for an unknown or other-creator private identity",()=>{expect(buildAudienceDashboard(rows,options("doesnotexist")).followers.total).toBe(0);});
  it("preserves visible joined-through account and provider search",()=>{expect(buildAudienceDashboard(rows,options("KwaMoon")).followers.total).toBe(1);expect(buildAudienceDashboard(rows,options("youtube")).followers.total).toBe(1);});
  it("restores the canonical result when search and filter are cleared",()=>{expect(buildAudienceDashboard(rows,options("doesnotexist")).followers.total).toBe(0);expect(buildAudienceDashboard(rows,options("")).followers.total).toBe(1);});
  it("keeps clear/apply state URL-backed and resets pagination",()=>{const controls=readFileSync("components/dashboard/audience-controls.tsx","utf8");expect(controls).toContain('params.set("search"');expect(controls).toContain('params.set("filter"');expect(controls).not.toContain('params.set("page"');expect(controls).toContain('aria-label="Clear search"');expect(controls).toContain('router.push');});
  it("keeps private lookup server-only, creator-scoped, and out of diagnostics",()=>{const search=readFileSync("lib/audience-search.ts","utf8"),page=readFileSync("app/dashboard/audience/page.tsx","utf8");expect(search).toContain('import "server-only"');expect(search).toContain('.eq("creator_id",creatorId)');expect(search).toContain('.eq("status","active")');expect(page).not.toMatch(/rawQuery|email_ciphertext|destination_hash/);expect(page).toContain("matchedCount");expect(page).toContain("creatorScoped:true");});
});
