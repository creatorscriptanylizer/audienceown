import type { SocialProvider } from "@/lib/social-providers/types";
export const draftVariantTypes=["concise","standard","detailed","email","browser","sms","recovery"] as const;
export type DraftVariantType=typeof draftVariantTypes[number];
export type CreatorVoiceProfile={tone:"natural"|"energetic"|"professional"|"conversational"|"concise"|"educational";
audienceDescription:string;preferredTerminology:string;phrasesToAvoid:string;ctaStyle:string;customInstructions:string;
includeEmojis:boolean;includeHashtags:boolean;preserveSourceTitle:boolean;};
export type DraftEnhancementInput={creatorId:string;updateId:string;sourceProvider:SocialProvider|null;sourceObjectType:string|null;
sourceEventType:string|null;sourceTitle:string|null;sourceDescription:string|null;sourceUrl:string|null;sourcePublishedAt:string|null;
deterministicDraft:{title:string;body:string};creatorProfile:CreatorVoiceProfile;requestedVariants:DraftVariantType[];};
export type EnhancedDraftVariant={variantType:DraftVariantType;title:string;body:string;callToAction:string|null;sourceUrl:string|null;};
export type DraftEnhancementResult={provider:"openai";model:string;promptVersion:string;variants:EnhancedDraftVariant[];
usage:{inputTokens:number|null;outputTokens:number|null;estimatedCostMinorUnits:number|null};};
export interface AiProviderAdapter{name:"openai";enhance(input:DraftEnhancementInput,signal:AbortSignal):Promise<DraftEnhancementResult>;}
