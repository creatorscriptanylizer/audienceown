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
    const youtube = source("components/youtube-connection-manager.tsx");
    expect(card).toContain("break-words");
    expect(card).toContain("sm:flex-row");
    expect(card).toContain("w-full justify-center sm:w-auto");
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
    expect(audience).toContain("overflow-x-auto");
  });

  it("prevents native image inputs and upload actions from overflowing creator cards", () => {
    const page = source("app/dashboard/creator-page/page.tsx");
    expect(page).toContain("min-w-0 overflow-hidden");
    expect(page).toContain("max-w-full");
    expect(page).toContain("w-full justify-center text-xs sm:w-auto");
  });
});
