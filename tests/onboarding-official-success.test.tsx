import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OnboardingAccounts } from "@/components/onboarding-accounts";
import type { CreatorProviderAccount } from "@/lib/social-providers/creator-account-projection";

const entitlements={isAdmin:false,plan:"free",subscriptionStatus:"inactive",providerConnections:{official:{currentCount:0,limit:1,allowed:true},backup:{currentCount:0,limit:1,allowed:true}}} as const;
const capability=(provider:string,displayName:string)=>({provider,displayName,description:`Connect ${displayName}`,connectionAvailable:true,connectionMethod:"oauth",connectionHref:`/api/integrations/${provider}/connect?role=official`}) as never;
const account=(provider:CreatorProviderAccount["provider"],displayName:string):CreatorProviderAccount=>({accountKey:`${provider}-official`,provider,displayName,handle:`@${displayName.toLowerCase().replaceAll(" ","")}`,role:"official",connected:true,verified:true,primary:true,archived:false,revoked:false,needsAttention:false,publicProfileUrl:null,connectionHealth:"healthy",lastSynchronizedAt:null,connectionType:"oauth"});
const render=(accounts:CreatorProviderAccount[],provider="youtube",name="YouTube")=>renderToStaticMarkup(<OnboardingAccounts role="official" accounts={accounts} capabilities={[capability(provider,name)]} entitlements={entitlements}/>);

describe("Main account onboarding success",()=>{
  it("keeps the setup state until a real Main account is connected",()=>{const html=render([]);expect(html).toContain("Where followers know you");expect(html).toContain("Connect your Main account");expect(html).not.toContain("Your main account is connected");});
  it("renders the complete success state from connected account data",()=>{const html=render([account("youtube","KwaMoon")]);expect(html).toContain("Main account connected");expect(html).toContain("Your main account is connected");expect(html).toContain("Your audience now has a trusted account to recognize you from.");expect(html).toContain("YouTube");expect(html).toContain("KwaMoon");expect(html).toContain("Main account");expect(html).toContain("Connected");expect(html).toContain("Change account");expect(html).toContain("Continue to Recovery destination");expect(html).toContain('name="step" value="official"');expect(html).not.toContain("Connect your Main account");});
  it.each([["instagram","Instagram"],["tiktok","TikTok"],["x","X"],["spotify","Spotify"],["twitch","Twitch"],["linkedin","LinkedIn"],["facebook","Facebook"],["snapchat","Snapchat"],["pinterest","Pinterest"],["discord","Discord"]] as const)("is provider-neutral for %s",(provider,name)=>{const html=render([account(provider,`${name} Creator`)],provider,name);expect(html).toContain(name);expect(html).toContain(`${name} Creator`);expect(html).toContain("Your main account is connected");});
  it("ignores disconnected, archived, and revoked records",()=>{for(const state of [{connected:false},{archived:true},{revoked:true}]){const html=render([{...account("youtube","KwaMoon"),...state}]);expect(html).toContain("Connect your Main account");expect(html).not.toContain("Your main account is connected");}});
  it("uses server-provided OAuth-return data immediately",()=>{const html=render([account("youtube","OAuth Channel")]);expect(html).toContain("OAuth Channel");expect(html).toContain("Continue to Recovery destination");});
  it("advances the official CTA to the backup-account step",()=>{const action=readFileSync("app/onboarding/actions.ts","utf8");expect(action).toContain('step === "official" ? "/onboarding/accounts?step=backup"');});
});
