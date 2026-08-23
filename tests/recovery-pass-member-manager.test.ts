import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const flow = readFileSync("components/recovery-pass-flow.tsx", "utf8");
const styles = readFileSync("components/recovery-pass-flow.css", "utf8");

describe("returning-member Recovery Pass management", () => {
  it("renders canonical accounts as structured, provider-aware rows", () => {
    expect(flow).toContain("orderedAccounts.map((account)");
    expect(flow).toContain("getPlatform(account.provider)");
    expect(flow).toContain('account.role === "main" ? "Main account" : "Recovery account"');
    expect(flow).toContain("Connected</span>");
    expect(flow).toContain("<Brand provider={account.provider}");
  });

  it("keeps required protection and filters optional updates from member state", () => {
    expect(flow).toContain("RECOVERY_PASS_CATEGORIES.filter((key) => state.preferences[key])");
    expect(flow).toContain("Recovery alerts");
    expect(flow).toContain("Required</span>");
    expect(flow).toContain("No optional updates selected");
    expect(flow).toContain("Recovery alerts are still active.");
  });

  it("uses real canonical management actions without dead account UI", () => {
    expect(flow).toContain("onClick={onManageAccounts}");
    expect(flow).toContain("onClick={onManagePreferences}");
    expect(flow).toContain("onClick={onManageDelivery}");
    expect(flow).not.toContain("View and manage your account details.");
  });

  it("shows canonical delivery methods and a safe leave dialog", () => {
    expect(flow).toContain('method.type === "email"');
    expect(flow).toContain('method.type === "web_push"');
    expect(flow).toContain('role="dialog" aria-modal="true"');
    expect(flow).toContain("You can join again later.");
    expect(styles).toContain(".rp-leave-overlay");
  });

  it("provides the shared management action, provider, responsive, and reduced-motion treatments", () => {
    expect(styles).toContain(".rp-manager-action");
    expect(styles).toContain(".rp-manager-account>.rp-brand");
    expect(styles).toContain("@media(max-width:520px)");
    expect(styles).toContain("@media(prefers-reduced-motion:reduce)");
  });
});
