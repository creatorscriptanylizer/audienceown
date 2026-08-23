// @vitest-environment jsdom
import {readFileSync} from "node:fs";
import {act,useState} from "react";
import {createRoot} from "react-dom/client";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {ProviderConnectionMethodSelector,providerConnectionBenefits} from "@/components/providers/provider-connection-method-selector";
import type {ProviderConnectionCapability,SocialProvider} from "@/lib/social-providers/types";
import {getPlatform} from "@/lib/platforms";

function capability(provider:SocialProvider,patch:Partial<ProviderConnectionCapability>={}):ProviderConnectionCapability{return{provider,displayName:getPlatform(provider)?.name??provider,description:"Canonical provider connection",oauthSupported:true,oauthStatus:"available",implementationStatus:"implemented",configurationStatus:"configured",reviewStatus:"not_applicable",connectable:true,connectPath:`/api/integrations/${provider}/connect`,manualSupported:false,manualInput:"profile_url",supportsAudienceMetrics:true,audienceUnit:"followers",supportsAutomaticVerification:true,supportsManualVerification:false,supportsWebhooks:false,supportsPolling:true,...patch};}
const render=(provider:Exclude<SocialProvider,"podcast"|"rss">,role:"official"|"backup"="official",patch:Partial<ProviderConnectionCapability>={},value:null|"automatic"|"manual"="automatic")=>renderToStaticMarkup(<ProviderConnectionMethodSelector platform={getPlatform(provider)!} capability={capability(provider,patch)} value={value} role={role} onChange={()=>undefined}/>);

describe("shared provider connection method selector",()=>{
  it("renders the approved two-method YouTube Main experience",()=>{
    const html=render("youtube");
    for(const copy of ["YouTube","Main account","This will be your primary YouTube account in this Recovery Network.","Choose how to connect","Select the connection that works best for this account.","Recommended","Connect with YouTube","Manual","Add URL or handle","Verified connection","Automatic audience sync","Connection health monitoring","Read-only access","Secure connection","Read-only YouTube access","We never post, update, or delete content."])expect(html).toContain(copy);
    expect(html).toContain('role="radiogroup"');expect(html.match(/role="radio"/g)).toHaveLength(2);expect(html).toContain('aria-checked="true"');expect(html).toContain('aria-checked="false"');
    expect(html).not.toContain("Fallback");expect(html).not.toContain("Keep this as a recovery destination");
  });

  it("derives Recovery role copy independently from provider identity",()=>{
    const html=render("youtube","backup");
    expect(html).toContain("Recovery account");expect(html).toContain("Verify the Recovery account and keep its connection health synchronized.");expect(html).not.toContain("Main account");
  });

  it("renders the existing manual path when OAuth is unavailable",()=>{
    const html=render("linkedin","official",{oauthSupported:false,oauthStatus:"unsupported",connectable:false,connectPath:null,manualSupported:true,supportsAutomaticVerification:false,supportsAudienceMetrics:false,supportsPolling:false},"manual");
    for(const copy of ["Manual","Add URL or handle","Add the public LinkedIn profile manually without provider authorization.","Quick setup","Public profile link","No automatic synchronization"])expect(html).toContain(copy);
    expect(html).not.toContain("Recommended");expect(html).not.toContain("Connect with LinkedIn");expect(html).toContain('aria-checked="true"');
  });

  it("shows both compact options and role-aware Recovery manual copy when both are canonical",()=>{
    const html=render("facebook","backup",{manualSupported:true});
    expect(html.match(/role="radio"/g)).toHaveLength(2);expect(html).toContain("Connect with Facebook");expect(html).toContain("Add the public Facebook profile as a Recovery destination without provider authorization.");expect(html).not.toContain("YouTube");
  });

  it("preserves provider-native identity through the shared registry presentation",()=>{
    for(const provider of ["facebook","instagram","tiktok","x","twitch","discord","snapchat","pinterest","spotify","linkedin"] as const){const html=render(provider);const platform=getPlatform(provider)!;expect(html).toContain(platform.name);expect(html).toContain(`--provider-color:${platform.brandColor}`);expect(html).not.toContain("YouTube");}
  });

  it("renders truthful benefits only when canonical capability supports them",()=>{
    const minimal=capability("spotify",{supportsAutomaticVerification:false,supportsAudienceMetrics:false,supportsPolling:false,supportsWebhooks:false});
    expect(providerConnectionBenefits(minimal)).toEqual(["Secure provider authorization"]);
    const rich=capability("twitch",{supportsWebhooks:true});expect(providerConnectionBenefits(rich)).toEqual(["Verified connection","Automatic audience sync","Connection health monitoring","Secure provider authorization"]);
  });

  it("keeps unavailable OAuth visible but not falsely connectable",()=>{
    const html=render("instagram","official",{connectable:false,configurationStatus:"missing",oauthStatus:"not_configured"});
    expect(html).toContain("Provider connection is not configured in this environment.");expect(html).toContain("Currently unavailable");expect(html).toContain("disabled");expect(html).toContain("Add URL or handle");
  });

  it("exposes selected state beyond color and no sensitive implementation data",()=>{
    const html=render("youtube","official",{},"automatic");
    expect(html).toContain('aria-checked="true"');expect(html).toContain("is-selected");expect(html).not.toMatch(/accessToken|clientSecret|nonce|codeVerifier/);
  });

  it("keeps default selection and footer CTA synchronized in the shared modal",()=>{
    const manager=readFileSync("components/platforms-manager.tsx","utf8"),css=readFileSync("app/globals.css","utf8");
    expect(manager).toContain('platformId,method:"automatic",step:"method"');
    expect(manager).toContain('method:item.externalAccountId?"automatic":"manual"');
    expect(manager).toContain('flow.method==="automatic"?<a');
    expect(manager).toContain("Connect with {getPlatform(flow.platformId)!.name}<ChevronRight/>");
    expect(manager).toContain("Continue with URL <ChevronRight/>");
    expect(manager).toContain('<div className="provider-footer-actions"><button type="button" className="button button-secondary"');
    for(const contract of [".accounts-config-modal:has(.provider-connection-experience){width:min(1320px","width:min(1240px,100%)","grid-template-columns:repeat(2,minmax(0,1fr))",".provider-connection-experience .connection-method-card{width:100%;min-width:0",".provider-trust-strip{width:100%;min-width:0",".account-picker-modal:has(.provider-connection-experience)>footer{width:100%;min-width:0","@media(max-width:900px)","@media(prefers-reduced-motion:reduce)"])expect(css).toContain(contract);
    expect(css).not.toContain("width:min(1240px,calc(100vw - 64px))");
  });

  it("switches the announced single selection from Recommended to Manual",async()=>{
    const container=document.createElement("div"),root=createRoot(container),platform=getPlatform("youtube")!,youtube=capability("youtube");
    function Harness(){const[value,setValue]=useState<"automatic"|"manual">("automatic");return <ProviderConnectionMethodSelector platform={platform} capability={youtube} value={value} role="official" onChange={setValue}/>;}
    await act(async()=>root.render(<Harness/>));const radios=[...container.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(radios.map(radio=>radio.getAttribute("aria-checked"))).toEqual(["true","false"]);
    await act(async()=>radios[1].click());expect(radios.map(radio=>radio.getAttribute("aria-checked"))).toEqual(["false","true"]);
    await act(async()=>root.unmount());
  });
});
