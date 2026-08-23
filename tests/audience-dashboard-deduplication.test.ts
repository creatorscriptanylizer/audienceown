import { describe,expect,it } from "vitest";
import { buildAudienceDashboard } from "@/lib/audience-dashboard";

const now=new Date("2026-08-19T12:00:00Z");
const options={page:1,pageSize:20,query:"",filter:"all" as const,range:"30d" as const,now};
const connection=(id:string,person:string,status="active")=>({id,follower_contact_id:person,status,activated_at:"2026-08-10T10:00:00Z",consented_at:"2026-08-10T10:00:00Z",deactivated_at:null,unsubscribed_at:null,source_platform:"direct"});
const account=(id:string,name:string,account_type:string,platform="youtube")=>({id,label:name,external_account_name:name,account_type,platform});

describe("canonical audience dashboard aggregation",()=>{
  it("deduplicates relationship rows by canonical follower_contact_id while preserving every account source",()=>{
    const data=buildAudienceDashboard({
      connections:[connection("join-a","person-a"),connection("join-b","person-a"),connection("join-c","person-a")],
      methods:[],categories:[],legacyPreferences:[],
      accounts:[account("kwamoon","KwaMoon","official"),account("nana","nana_friggy","backup","instagram"),account("lineconomy","Lineconomy","backup")],
      memberships:[{follower_connection_id:"join-a",connected_account_id:"kwamoon"},{follower_connection_id:"join-b",connected_account_id:"nana"},{follower_connection_id:"join-c",connected_account_id:"lineconomy"}],
    },options);
    expect(data.summary.protectedFollowers).toBe(1);
    expect(Object.fromEntries(data.sources.map(item=>[item.displayName,item.protectedFollowerCount]))).toEqual({KwaMoon:1,nana_friggy:1,Lineconomy:1});
    expect(data.followers.rows).toHaveLength(1);
    expect(data.followers.rows[0].sources).toHaveLength(3);
  });

  it("keeps preferences isolated and reachability unique across overlapping verified channels",()=>{
    const data=buildAudienceDashboard({
      connections:[connection("a","person-a"),connection("b","person-b")],accounts:[],memberships:[],legacyPreferences:[],
      categories:[{follower_connection_id:"a",category_key:"videos",enabled:true},{follower_connection_id:"a",category_key:"announcements",enabled:true},{follower_connection_id:"b",category_key:"livestreams",enabled:true}],
      methods:[{follower_contact_id:"person-a",method_type:"email",method_status:"verified",destination_masked:"a•••@example.com",consent_revoked_at:null,opted_out_at:null},{follower_contact_id:"person-b",method_type:"email",method_status:"verified",destination_masked:"b•••@example.com",consent_revoked_at:null,opted_out_at:null},{follower_contact_id:"person-b",method_type:"sms",method_status:"verified",destination_masked:"+49 ••• ••90",consent_revoked_at:null,opted_out_at:null}],
    },options);
    expect(data.summary).toMatchObject({protectedFollowers:2,reachableNow:2,reachabilityRate:100});
    expect(Object.fromEntries(data.preferences.map(item=>[item.key,item.followerCount]))).toMatchObject({videos:1,announcements:1,livestreams:1});
    expect(data.deliveryHealth).toMatchObject({reachableUnique:2,emailVerified:2,smsVerified:1,bothVerified:1});
    expect(data.followers.rows.map(row=>row.identity)).toEqual(["a•••@example.com","b•••@example.com"]);
  });

  it("excludes inactive canonical relationships from the protected audience",()=>{
    const data=buildAudienceDashboard({connections:[connection("active","person-a"),connection("revoked","person-b","unsubscribed"),connection("inactive","person-c","deactivated")],methods:[],categories:[],legacyPreferences:[],memberships:[],accounts:[]},options);
    expect(data.summary.protectedFollowers).toBe(1);
  });
});
