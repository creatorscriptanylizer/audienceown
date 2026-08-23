import { safeCsvCell } from "@/lib/validation";

export type AudienceExportConnection={id:string;follower_contact_id:string;consented_at:string;activated_at:string|null;source_platform:string};
export type AudienceExportContact={id:string;email_masked:string|null;phone_masked:string|null};
export type AudienceExportPreference={follower_connection_id:string;creator_announcements:boolean;new_content:boolean;important_account_updates:boolean};

/** Serializes only already-authorized, active rows and never accepts raw contact fields. */
export function buildAudienceExportCsv(connections:AudienceExportConnection[],contacts:AudienceExportContact[],preferences:AudienceExportPreference[]){
  const byContact=new Map(contacts.map(item=>[item.id,item])),byPreference=new Map(preferences.map(item=>[item.follower_connection_id,item]));
  const header=["protected_at","source_platform","recovery_alerts","video_alerts","announcement_alerts","masked_email","masked_phone"],lines=[header.map(safeCsvCell).join(",")],exported=new Set<string>();
  for(const row of connections){
    if(exported.has(row.follower_contact_id))continue;
    const contact=byContact.get(row.follower_contact_id);if(!contact)continue;
    exported.add(row.follower_contact_id);
    const preference=byPreference.get(row.id);
    lines.push([row.activated_at??row.consented_at,row.source_platform,String(preference?.important_account_updates??false),String(preference?.new_content??false),String(preference?.creator_announcements??false),contact.email_masked??"",contact.phone_masked??""].map(safeCsvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}
