import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProviderConnectionMethodSelector } from "@/components/providers/provider-connection-method-selector";
import { providerConnectionCapability } from "@/lib/social-providers/connection-capabilities";
import { youtubeProvider } from "@/lib/social-providers/providers/youtube";
import { getPlatform } from "@/lib/platforms";

describe("provider connection method selector", () => {
  const platform = getPlatform("youtube")!;
  const original={...process.env};
  beforeEach(()=>Object.assign(process.env,{GOOGLE_YOUTUBE_CLIENT_ID:"id",GOOGLE_YOUTUBE_CLIENT_SECRET:"secret",GOOGLE_YOUTUBE_REDIRECT_URI:"https://app.test/api/integrations/youtube/callback",YOUTUBE_OAUTH_STATE_SECRET:"state"}));
  afterEach(()=>{process.env={...original};});
  it("offers capability-controlled OAuth and a manual fallback", () => {
    const html = renderToStaticMarkup(<ProviderConnectionMethodSelector platform={platform}
      capability={providerConnectionCapability(youtubeProvider, true)} value={null} roleLabel="Main account" onChange={() => undefined}/>);
    expect(html).toContain("Connect with YouTube");
    expect(html).toContain("Add URL or handle");
    expect(html).toContain("Verified ownership");
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain("accessToken");
  });
  it("disables OAuth when credentials are unavailable while retaining manual setup", () => {
    delete process.env.GOOGLE_YOUTUBE_CLIENT_SECRET;
    const html = renderToStaticMarkup(<ProviderConnectionMethodSelector platform={platform}
      capability={providerConnectionCapability(youtubeProvider, false)} value={null} roleLabel="Backup account" onChange={() => undefined}/>);
    expect(html).toContain("Automatic connection is not configured in this environment.");
    expect(html).toContain("Add manually instead");
    expect(html).toContain("disabled");
    expect(html).toContain("No provider login required");
  });
});
