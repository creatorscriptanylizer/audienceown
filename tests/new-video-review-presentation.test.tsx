import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NewVideoReviewContent } from "@/components/broadcast-studio/broadcast-studio";
import type { PlatformAccount } from "@/components/broadcast-studio/types";

const account = (id: string, platform: string, label: string): PlatformAccount => ({
  id, platform, label, account_type: "official", url: `https://${platform}.com/${label}`,
  is_primary: true, is_public: true, position: 0,
});
const accounts = [account("youtube-1", "youtube", "KwaMoon"), account("tiktok-1", "tiktok", "NPA")];
const css = readFileSync("app/globals.css", "utf8");
const render = (overrides: Partial<React.ComponentProps<typeof NewVideoReviewContent>> = {}) => renderToStaticMarkup(<NewVideoReviewContent
  accounts={accounts} audience={12} title="How to make money" subject="New walkthrough" previewText="A practical guide" message="Make money with the full walkthrough." destination="https://www.youtube.com/watch?v=example" ctaLabel="Watch video" {...overrides}
/>);

describe("elite New Video review presentation", () => {
  it("renders selected publishing accounts with local provider identities", () => {
    const html = render();
    expect(html).toContain("YouTube · KwaMoon");
    expect(html).toContain("TikTok · NPA");
    expect(html).toContain("provider-youtube");
    expect(html).toContain("provider-tiktok");
    expect(html).not.toContain("native followers can receive");
  });

  it("renders a safe external verification link without a mutation control", () => {
    const html = render();
    expect(html).toContain('href="https://www.youtube.com/watch?v=example"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Open YouTube video in a new tab"');
    expect(html).not.toContain("formAction");
    expect(html).not.toContain('type="submit"');
  });

  it("does not link an invalid or non-HTTPS destination", () => {
    const html = render({ destination: "http://youtube.com/watch?v=unsafe" });
    expect(html).not.toContain("Open video");
    expect(html).not.toContain('href="http://youtube.com');
    expect(html).toContain("Add a valid HTTPS destination before sending.");
  });

  it("shows positive and zero Recovery Pass audience states honestly", () => {
    const positive = render();
    const zero = render({ audience: 0 });
    expect(positive).toContain(">12<");
    expect(positive).toContain("Recovery Pass followers can receive this video alert");
    expect(zero).toContain("review-audience-card is-zero");
    expect(zero).toContain("No followers are currently opted in to receive video updates.");
    expect(zero).toContain("This update cannot be sent or scheduled until at least one follower is opted in. It will remain a draft.");
  });

  it("uses only the actual draft title, message, destination, and CTA", () => {
    const html = render();
    for (const value of ["How to make money", "Make money with the full walkthrough.", "youtube.com/watch?v=example", "Watch video"]) expect(html).toContain(value);
  });

  it("stacks the review cards and expands verification actions on mobile", () => {
    expect(css).toContain("@media(max-width:760px){.new-video-review-top,.new-video-review-accounts{grid-template-columns:1fr}");
    expect(css).toContain(".new-video-open-link{grid-column:1/-1;justify-content:center}");
    expect(css).toContain("@media(max-width:420px){.new-video-review{gap:13px}");
  });
});
