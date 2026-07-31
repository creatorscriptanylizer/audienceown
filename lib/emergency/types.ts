export const emergencyTypes=["account_hacked","account_banned","account_suspended","account_changed","fake_account_warning","scam_warning","other"]as const;
export const emergencyStatuses=["draft","pending_verification","pending_approval","ready","active","resolved","cancelled"]as const;
export const emergencySeverities=["informational","important","critical"]as const;
export type EmergencyType=typeof emergencyTypes[number];
export type EmergencyStatus=typeof emergencyStatuses[number];
export type EmergencySeverity=typeof emergencySeverities[number];
export type EmergencyRecord={id:string;creator_id:string;emergency_type:EmergencyType;lifecycle_status:EmergencyStatus;
severity:EmergencySeverity;title:string;message:string;content_revision:number;approved_revision:number|null;creator_update_id:string|null;
requested_by:string;submitted_at:string|null;activated_at:string|null;resolved_at:string|null;cancelled_at:string|null;created_at:string;updated_at:string};
export type EmergencyReplacement={id:string;provider:string;stable_provider_account_id:string;display_handle:string;
canonical_profile_url:string;verification_state:"pending"|"verified"|"rejected"|"revoked";verification_method:string|null;official:boolean;verified_at:string|null};

