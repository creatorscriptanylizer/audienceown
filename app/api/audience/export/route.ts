import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { safeCsvCell } from "@/lib/validation";

export async function GET(){
  const s=await createClient();if(!s)return NextResponse.json({error:"Not configured"},{status:503});
  const{data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const{data:creator}=await s.from("creators").select("id,public_slug").eq("owner_user_id",user.id).maybeSingle();
  if(!creator)return NextResponse.json({error:"Creator not found"},{status:404});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:"Export is not configured"},{status:503});
  const admin=createAdmin<Database>(url,key,{auth:{persistSession:false}});
  const{data:connections}=await admin.from("follower_connections")
    .select("id,follower_contact_id,status,consented_at,activated_at,source_platform")
    .eq("creator_id",creator.id).order("consented_at");
  const contactIds=(connections??[]).map(x=>x.follower_contact_id);
  const connectionIds=(connections??[]).map(x=>x.id);
  const[{data:contacts},{data:prefs}]=await Promise.all([
    contactIds.length?admin.from("follower_contacts").select("id,email_masked,phone_masked,email_hash,phone_hash").in("id",contactIds):Promise.resolve({data:[]}),
    connectionIds.length?admin.from("follower_notification_preferences").select("follower_connection_id,creator_announcements,new_content,important_account_updates").in("follower_connection_id",connectionIds):Promise.resolve({data:[]}),
  ]);
  const byContact=new Map((contacts??[]).map(x=>[x.id,x])),byPref=new Map((prefs??[]).map(x=>[x.follower_connection_id,x]));
  const header=["protected_at","status","source_platform","recovery_alerts","video_alerts","announcement_alerts","email_enabled","push_enabled","sms_enabled","masked_email","masked_phone"];
  const lines=[header.map(safeCsvCell).join(",")];
  for(const row of connections??[]){const p=byPref.get(row.id),contact=byContact.get(row.follower_contact_id);if(!contact)continue;lines.push([row.activated_at??row.consented_at,row.status,row.source_platform,String(p?.important_account_updates??false),String(p?.new_content??false),String(p?.creator_announcements??false),String(Boolean(contact.email_hash)),String(false),String(Boolean(contact.phone_hash)),contact.email_masked??"",contact.phone_masked??""].map(safeCsvCell).join(","))}
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="audienceown-${creator.public_slug}-protected-audience.csv"`,"cache-control":"private, no-store, max-age=0","x-robots-tag":"noindex, nofollow, noarchive"}});
}
