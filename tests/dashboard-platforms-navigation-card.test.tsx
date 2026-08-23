import {readFileSync} from "node:fs";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {PlatformsNavigationCard} from "@/components/dashboard/creator-command-dashboard";
import {DASHBOARD_PLATFORMS_ROUTE} from "@/lib/dashboard-routes";
import type {CreatorRecommendation} from "@/lib/intelligence/creator-recommendations";

const render=()=>renderToStaticMarkup(<PlatformsNavigationCard/>);
const recommendation=(patch:Partial<CreatorRecommendation>={}):CreatorRecommendation=>({id:"connect-first-platform",type:"platform_setup",priority:"high",category:"platforms",title:"Connect your first platform",description:"Your recovery network starts with the accounts your audience already knows. Add your first platform to get started.",reason:"No Main account is currently connected.",actionId:"ADD_FIRST_ACCOUNT",sourceSignals:["NO_OFFICIAL_ACCOUNTS"],generatedBy:"deterministic",...patch});

describe("main dashboard Platforms navigation card",()=>{
  it("renders the approved minimal navigation copy",()=>{
    const html=render();
    for(const copy of ["Your platforms","Manage your platforms","Connect, manage, or update the accounts that power your AudienceOwn recovery network.","Manage platforms"])expect(html).toContain(copy);
  });

  it("uses the canonical Platforms route with whole-card link semantics",()=>{
    expect(DASHBOARD_PLATFORMS_ROUTE).toBe("/dashboard/platforms");
    const html=render();
    expect(html).toMatch(/^<a[^>]*href="\/dashboard\/platforms"/);
    expect(html).toContain('aria-label="Manage your platforms"');
    expect(html.match(/<a/g)).toHaveLength(1);
    expect(html).not.toContain("<button");
  });

  it("does not duplicate account, provider, entitlement, health, or count data",()=>{
    const html=render();
    for(const forbidden of ["Connected accounts","Official accounts","Backup accounts","Unlimited","entitlement","connection health","YouTube","Instagram","TikTok"])expect(html).not.toContain(forbidden);
    const visibleText=html.replace(/<[^>]+>/g," ").replace(/\s+/g," ");
    expect(visibleText).not.toMatch(/\b\d+\s+(connected|accounts?|platforms?)\b/i);
  });

  it("pairs with Recovery Pass in a responsive 60/40 row",()=>{
    const component=readFileSync("components/dashboard/creator-command-dashboard.tsx","utf8");
    const css=readFileSync("components/dashboard/creator-command-dashboard.css","utf8");
    expect(component).toContain('<section className="premium-recovery-pass-row"><RecoveryPassCard');
    expect(component.indexOf("<RecoveryPassCard")).toBeLessThan(component.indexOf("<PlatformsNavigationCard"));
    expect(css).toContain("grid-template-columns:minmax(0,3fr) minmax(280px,2fr)");
    expect(css).toContain("@media(max-width:980px)");
    expect(css).toMatch(/@media\(max-width:700px\)\{\.premium-recovery-pass-row\{grid-template-columns:1fr\}/);
  });

  it("defines restrained interaction, visible focus utility, and reduced motion",()=>{
    const html=render();
    const css=readFileSync("components/dashboard/creator-command-dashboard.css","utf8");
    expect(html).toContain("focus-visible:outline-2");
    expect(css).toContain("translateY(-2px)");
    expect(css).toContain("translateX(3px)");
    expect(css).toContain("prefers-reduced-motion:reduce");
    expect(css).toContain(".platforms-navigation-card:hover");
  });

  it("renders the zero-account contextual state without becoming an account list",()=>{
    const html=renderToStaticMarkup(<PlatformsNavigationCard recommendation={recommendation()}/>);
    for(const copy of ["Connect your first platform","AI recommendation","Add at least one Main account","Add your first account"])expect(html).toContain(copy);
    expect(html).toContain('href="/dashboard/platforms"');
    expect(html).not.toContain("Connected accounts");
  });

  it("renders recovery and attention states with trusted actions",()=>{
    const recovery=renderToStaticMarkup(<PlatformsNavigationCard recommendation={recommendation({id:"add-recovery-account",type:"recovery_setup",category:"recovery",title:"Strengthen your recovery setup",description:"You have a Main account connected. Add a recovery destination so your audience has another trusted place to find you.",actionId:"ADD_RECOVERY_ACCOUNT",sourceSignals:["NO_RECOVERY_ACCOUNTS"]})}/>);
    expect(recovery).toContain("Protect your audience with a Recovery Account.");expect(recovery).toContain("Add recovery account");
    const issue=renderToStaticMarkup(<PlatformsNavigationCard recommendation={recommendation({id:"account-youtube-attention",type:"connection_review",priority:"critical",title:"YouTube needs your attention",description:"Authorization was revoked. Restore this connection to keep your recovery setup healthy.",actionId:"REVIEW_ACCOUNT",sourceSignals:["ACCOUNT_NEEDS_ATTENTION"]})}/>);
    expect(issue).toContain("YouTube needs your attention");expect(issue).toContain("Review connection");expect(issue).toContain("platforms-navigation-critical");
  });

  it("keeps healthy state free of recommendation decoration",()=>{
    const html=render();expect(html).not.toContain("AI recommendation");expect(html).toContain("Manage your platforms");
  });
});
