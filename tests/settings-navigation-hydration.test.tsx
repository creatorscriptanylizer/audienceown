// @vitest-environment jsdom

import { act } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/dashboard/settings" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

import { isActiveSettingsRoute, SettingsNavigation } from "@/components/settings-navigation";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => { document.body.innerHTML = ""; route.pathname = "/dashboard/settings"; });

describe("Settings navigation hydration", () => {
  it("matches only complete route segments", () => {
    expect(isActiveSettingsRoute("/dashboard/settings", "/dashboard/settings", true)).toBe(true);
    expect(isActiveSettingsRoute("/dashboard/settings/profile", "/dashboard/settings/profile")).toBe(true);
    expect(isActiveSettingsRoute("/dashboard/settings/profile-extra", "/dashboard/settings/profile")).toBe(false);
  });

  it.each(["/dashboard/settings", "/dashboard/settings/account"])('hydrates %s without changing its initial markup', async (pathname) => {
    route.pathname = pathname;
    const container = document.createElement("div");
    container.innerHTML = renderToString(<SettingsNavigation/>);
    document.body.append(container);
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
    expect([...container.querySelectorAll("a")].map((link) => [link.getAttribute("data-tone"), Boolean(link.querySelector(".settings-nav-icon"))])).toEqual([
      ["violet", true], ["blue", true], ["indigo", true], ["cyan", true], ["aqua", true], ["violet", true],
    ]);
    const errors: unknown[][] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));
    let root: Root | undefined;
    try {
      await act(async () => { root = hydrateRoot(container, <SettingsNavigation/>); });
      expect(errors).toEqual([]);
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    } finally {
      consoleError.mockRestore();
      await act(async () => root?.unmount());
      container.remove();
    }
  });
});
