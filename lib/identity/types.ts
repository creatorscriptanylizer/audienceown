export type IdentityStatus="incomplete"|"verified"|"needs_attention"|"restricted"|"archived";
export type IdentityVerificationStatus="unverified"|"pending"|"verified"|"needs_attention"|"revoked"|"unavailable"|"archived";
export type IdentityAccountKind="creator_account"|"organization_account"|"page"|"channel"|"artist"|"show"|"guild"|"board"|"domain_identity"|"replacement_account";
export type PublicIdentityAccount={provider:string;displayHandle:string|null;displayName:string|null;canonicalProfileUrl:string;accountKind:IdentityAccountKind;verificationStatus:"verified";official:boolean;primary:boolean;verifiedAt:string|null};
export type PublicIdentityDomain={hostname:string;canonicalUrl:string;official:boolean;primary:boolean;verifiedAt:string|null};
export type PublicIdentityRelationship={relationshipType:string;sourceProvider:string|null;sourceUrl:string|null;targetProvider:string|null;targetUrl:string|null;verifiedAt:string|null};
export type PublicIdentityGraph={creator:{slug:string;displayName:string};identityStatus:IdentityStatus;accounts:PublicIdentityAccount[];domains:PublicIdentityDomain[];relationships:PublicIdentityRelationship[];lastUpdatedAt:string};
