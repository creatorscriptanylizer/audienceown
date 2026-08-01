export const ecosystemDestinationTypes=["community","announcement_channel","developer_profile","organization","repository","package","membership","newsletter","website","application","podcast","feed","merchandise","commerce","booking","contact","donation","event","other"]as const;
export type EcosystemDestinationType=typeof ecosystemDestinationTypes[number];
export const ecosystemProviders=["discord","github","patreon","website","newsletter","podcast","rss","application","other"]as const;
export type EcosystemProvider=typeof ecosystemProviders[number];
export type EcosystemCapabilities={connectionSupported:boolean;identityVerificationSupported:boolean;organizationVerificationSupported:boolean;destinationDiscoverySupported:boolean;webhookSupported:boolean;pollingSupported:boolean;manualImportSupported:boolean;stableExternalIdSupported:boolean;revalidationSupported:boolean};
export type PublicEcosystemDestination={type:EcosystemDestinationType;provider:string;name:string;handle?:string;url:string;official:true;primary:boolean;verifiedAt?:string};
export type PublicEcosystemGraph={version:"audienceown-ecosystem-v1";creator:{slug:string;verificationUrl:string};destinations:PublicEcosystemDestination[];lastUpdatedAt:string|null;assertionUrl:string};

