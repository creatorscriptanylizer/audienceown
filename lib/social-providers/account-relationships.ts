import {canonicalAccountConnected} from "./connection-health";

type RelationshipAccount={id:string;creator_id:string;platform:string;account_type:string;url?:string|null;external_account_id?:string|null;connection_health?:string|null;provider_status?:string|null};

/** Acquisition-independent validation for the canonical official -> backup relation. */
export function canProtectBackup(input:{backupId?:string;backupCreatorId:string;backupProvider:string;backupRole:string;target:RelationshipAccount}){
  const{target}=input;
  return input.backupRole==="backup"
    &&target.account_type==="official"
    &&target.creator_id===input.backupCreatorId
    &&target.platform===input.backupProvider
    &&target.id!==input.backupId
    &&canonicalAccountConnected({health:target.connection_health,providerStatus:target.provider_status,hasPublicUrl:Boolean(target.url),hasExternalAccountId:Boolean(target.external_account_id)});
}
