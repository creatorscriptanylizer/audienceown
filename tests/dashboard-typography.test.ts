import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalCss = readFileSync("app/globals.css", "utf8");
const dashboardCss = readFileSync("components/dashboard/creator-command-dashboard.css", "utf8");
const shell = readFileSync("components/dashboard-shell.tsx", "utf8");

describe("authenticated app typography contract", () => {
  it("defines one semantic product scale from the exact Updates hierarchy", () => {
    for (const token of ["display", "page-title", "section-title", "card-title", "body-lg", "body", "body-sm", "label", "metadata", "action"]) {
      expect(globalCss).toContain(`--text-${token}:`);
      expect(globalCss).toContain(`.type-${token}`);
    }
    expect(globalCss).toContain("--text-body-lg: .95rem");
    expect(globalCss).toContain("--text-body: .84rem");
    expect(globalCss).toContain("--text-body-sm: .77rem");
    expect(globalCss).toContain("--text-metadata: .67rem");
    expect(globalCss).toMatch(/@media\(max-width:700px\)[\s\S]*--text-body-lg:\.82rem/);
  });

  it("scopes legacy utility normalization to the authenticated shell", () => {
    expect(shell).toContain('className="dashboard-app ');
    expect(globalCss).toContain(".dashboard-app main .text-sm{font-size:var(--text-body-sm)");
    expect(globalCss).toContain(".dashboard-app main .text-xs{font-size:var(--text-label)");
    expect(globalCss).not.toContain("body .text-sm{");
  });

  it("makes the command dashboard consume the shared scale", () => {
    expect(dashboardCss).not.toContain("--dashboard-text-");
    expect(dashboardCss).toContain("font-size:var(--text-body)");
    expect(dashboardCss).toContain("font-size:var(--text-section-title)");
    expect(dashboardCss).toContain("font-size:var(--text-display)");
  });

  it("maps legacy supporting copy onto Updates body roles", () => {
    for (const selector of [".platform-card-copy small", ".connected-card-copy small", ".account-section-heading p", ".method-copy small", ".backup-empty-state p"]) {
      expect(globalCss).toContain(`.dashboard-app ${selector}`);
    }
  });
});
