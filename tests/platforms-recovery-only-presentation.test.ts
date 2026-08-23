import{readFileSync}from"node:fs";
import{describe,expect,it}from"vitest";

const source=(path:string)=>readFileSync(path,"utf8");
const page=source("app/dashboard/platforms/page.tsx"),manager=source("components/platforms-manager.tsx"),networks=source("components/recovery-network-manager.tsx"),oauth=source("app/api/integrations/[provider]/callback/route.ts"),autoLink=source("lib/social-providers/recovery-auto-link.ts");

describe("Platforms Recovery Networks-only composition",()=>{
  it("does not compose provider operations or automation surfaces",()=>{
    for(const value of ["SocialProviderGrid","ProviderExpansionSummary","ProviderExpansionTwoSummary","ProviderExpansionThreeSummary","ProviderExpansionFourSummary","YouTubeAutomationPanel","Connected content sources","Provider Expansion I","Provider Expansion II","Provider Expansion III","Provider Expansion IV","YouTube automation unavailable"])expect(page).not.toContain(value);
  });

  it("does not fetch page-only provider diagnostics or automation activity",()=>{
    for(const table of ["creator_activity","creator_updates","provider_access_reviews","manual_service_connections"])expect(page).not.toContain(`from(\"${table}\")`);
    expect(page).toContain('select("id,platform,provider_status")');
    expect(page).toContain('.in("platform",["facebook","discord"])');
  });

  it("keeps Recovery Networks and every account-management entry point",()=>{
    expect(page).toContain("<PlatformsManager");
    for(const copy of ["Your recovery networks","Set up a Recovery Network","Add Main account","Add Recovery account","Delete Main account","Delete Recovery account"])expect(networks).toContain(copy);
  });

  it("keeps provider pickers, connection modals, and contextual OAuth assignment",()=>{
    expect(manager).toContain("official-platform-picker");
    expect(manager).toContain("ProviderConnectionMethodSelector");
    expect(manager).toContain("recoveryNetworkId");
    expect(page).toContain("YouTubeChannelSelection");
    expect(page).toContain("MetaAssetSelection");
    expect(page).toContain("DiscordGuildSelection");
    expect(oauth).toContain("applyRecoveryAutoLinkIntent");
    expect(autoLink).toContain("assign_recovery_account_to_network");
  });
});
