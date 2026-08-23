// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(auth)/actions", () => ({ logout: vi.fn() }));

import { DashboardAccountMenu } from "@/components/dashboard-account-menu";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
afterEach(async () => { await act(async () => root?.unmount()); document.body.innerHTML = ""; root = undefined; });

describe("dashboard creator account menu", () => {
  it("exposes the authenticated creator identity and closes with Escape", async () => {
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<DashboardAccountMenu displayName="Maya Chen" handle="maya" avatarUrl={null} status="Recovery Pass active"/>));
    const trigger = container.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await act(async () => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const menu = document.body.querySelector('[role="menu"]');
    expect(menu?.parentElement).toBe(document.body);
    expect(menu?.textContent).toContain("@maya");
    expect(menu?.textContent).toContain("Current");
    expect(menu?.textContent).not.toContain("Add account");
    expect(menu?.querySelector('a[href="/dashboard/settings"]')?.textContent).toContain("Settings");
    const plans = menu?.querySelector<HTMLAnchorElement>('a[href="/dashboard/settings/plans"]');
    expect(plans?.textContent).toContain("Plans");
    expect(plans?.target).toBe("");
    expect(menu?.querySelector('a[href="/#pricing"], a[href="/dashboard/settings#billing"]')).toBeNull();
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});
