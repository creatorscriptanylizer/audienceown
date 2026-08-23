import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("mobile and responsive polish", () => {
  it("keeps dashboard and settings navigation scrollable, touch-sized, and route-aware", () => {
    const dashboard = source("components/dashboard-navigation.tsx");
    const settings = source("components/settings-navigation.tsx");
    expect(dashboard).toContain('aria-current={current?"page":undefined}');
    expect(dashboard).toContain("min-h-12");
    expect(dashboard).toContain("overflow-x-auto");
    expect(dashboard).toContain("snap-mandatory");
    expect(dashboard).toContain("motion-reduce:transition-none");
    expect(settings).toContain("overflow-x-auto");
    expect(settings).toContain("overscroll-x-contain");
    expect(settings).toContain('aria-current={current ? "page" : undefined}');
  });

  it("protects the mobile dashboard header and main content from long identity text and safe areas", () => {
    const shell = source("components/dashboard-shell.tsx");
    expect(shell).toContain("min-w-0");
    expect(shell).toContain("truncate");
    expect(shell).not.toContain('aria-label="View public Creator page"');
    expect(shell).not.toContain("View public page");
    expect(shell).toContain("env(safe-area-inset-bottom)");
  });

  it("stacks platform actions and wraps long account identifiers on narrow screens", () => {
    const card = source("components/connected-platform-card.tsx");
    const connectedCss = source("app/dashboard/settings/connected-accounts/connected-platforms.css");
    const youtube = source("components/youtube-connection-manager.tsx");
    expect(card).toContain("connected-card-actions");
    expect(connectedCss).toContain("text-overflow:ellipsis");
    expect(connectedCss).toContain("@media(max-width:699px)");
    expect(connectedCss).toContain(".connected-card-actions{grid-template-columns:1fr}");
    expect(connectedCss).toContain(".connected-card-actions .button{width:100%}");
    expect(youtube).toContain("w-full justify-center");
  });

  it("keeps public-page labels, Recovery Pass dialogs, and destructive actions usable at 320px", () => {
    const css = source("app/globals.css");
    const deletion = source("components/account-deletion-form.tsx");
    expect(css).toContain(".fan-link-card strong{overflow:visible;overflow-wrap:anywhere");
    expect(css).toContain("max-height:94dvh");
    expect(css).toContain("@media(max-width:380px)");
    expect(css).toContain('dialog[aria-labelledby="youtube-disconnect-title"]{max-height:calc(100dvh - 1rem)');
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(deletion).toContain("w-full justify-center");
  });

  it("makes wide audience data explicitly keyboard-scrollable", () => {
    const audience = source("app/dashboard/audience/page.tsx");
    expect(audience).toContain('role="region"');
    expect(audience).toContain('aria-label="Protected fans table"');
    expect(audience).toContain("tabIndex={0}");
    const styles = source("app/dashboard/audience/audience.css");
    expect(styles).toMatch(/\.followers-wrap\{[^}]*overflow-x:auto/);
  });

  it("keeps empty Recovery Network setup centered and sequential across breakpoints",()=>{
    const component=source("components/recovery-network-manager.tsx");
    const css=source("components/recovery-network-manager.module.css");
    expect(component.indexOf("mainSetup")).toBeLessThan(component.indexOf("setupConnector"));
    expect(component.indexOf("setupConnector")).toBeLessThan(component.indexOf("recoverySetup"));
    expect(css).toContain("width:min(780px,100%)");
    expect(css).toContain("@media(max-width:768px)");
    expect(css).toContain("@media(max-width:520px)");
    expect(css).toContain(".mainSetupCta,.recoverySetupCta{width:100%}");
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
  });

  it("replaces creator uploads with a responsive canonical Recovery Pass profile", () => {
    const page = source("app/dashboard/creator-page/page.tsx");
    const css = source("app/dashboard/creator-page/creator-page.css");
    expect(page).toContain("Recovery Pass Identity");
    expect(page).not.toContain("uploadCreatorImage");
    const form = source("components/creator-form.tsx");
    expect(form).not.toContain('htmlFor="recovery_pass_name"');
    expect(form).not.toContain("This is the public title of your Recovery Pass");
    expect(form).not.toContain('name="recovery_pass_name"');
    expect(css).toContain(".creator-url-field{grid-column:1/-1}");
    expect(css).toContain("@media(max-width:1024px)");
    expect(css).toContain("@media(max-width:700px)");
  });
});
