import type{DraftEnhancementInput,DraftVariantType,EnhancedDraftVariant}from"./types";
function compact(text:string,max:number){if(text.length<=max)return text;return `${text.slice(0,Math.max(1,max-1)).trimEnd()}…`;}
export function deterministicVariants(input:DraftEnhancementInput):EnhancedDraftVariant[]{
 const url=input.sourceUrl,baseTitle=input.deterministicDraft.title||input.sourceTitle||"New creator update";
 const description=input.sourceDescription?.trim()||input.deterministicDraft.body;const cta=url?"View source":null;
 const builders:Record<DraftVariantType,()=>EnhancedDraftVariant>={
 standard:()=>({variantType:"standard",title:compact(baseTitle,120),body:compact(description,3000),callToAction:cta,sourceUrl:url}),
 concise:()=>({variantType:"concise",title:compact(baseTitle,80),body:compact(description,280),callToAction:cta,sourceUrl:url}),
 detailed:()=>({variantType:"detailed",title:compact(baseTitle,120),body:compact(description,6000),callToAction:cta,sourceUrl:url}),
 email:()=>({variantType:"email",title:compact(baseTitle,160),body:compact(description,10000),callToAction:cta,sourceUrl:url}),
 browser:()=>({variantType:"browser",title:compact(baseTitle,60),body:compact(description,160),callToAction:null,sourceUrl:url}),
 sms:()=>({variantType:"sms",title:compact(baseTitle,60),body:compact(description,Math.max(40,320-(url?.length??0))),callToAction:null,sourceUrl:url}),
 recovery:()=>({variantType:"recovery",title:compact(baseTitle,120),body:compact(description,1000),callToAction:cta,sourceUrl:url})};
 return input.requestedVariants.map((type)=>builders[type]());
}
