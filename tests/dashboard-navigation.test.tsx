// @vitest-environment jsdom

import { act } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

import {
  DashboardNavigation,
  isActiveDashboardRoute,
  normalizeDashboardPathname,
} from "@/components/dashboard-navigation";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  route.pathname = "/dashboard";
});

async function expectCleanNavigationHydration(pathname: string, activeHref: string) {
  route.pathname = pathname;
  const server = renderToString(<DashboardNavigation/>);
  const serverContainer = document.createElement("div");
  serverContainer.innerHTML = server;

  expect(serverContainer.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  expect([...serverContainer.querySelectorAll("svg")]).toHaveLength(11);
  for (const icon of serverContainer.querySelectorAll("svg")) {
    expect(icon.getAttribute("width")).toBe("19");
    expect(icon.getAttribute("height")).toBe("19");
    expect(icon.getAttribute("stroke-width")).toBe("2");
  }

  const serverClasses = [...serverContainer.querySelectorAll("a")].map((link) => link.className);
  const container = document.createElement("div");
  container.innerHTML = server;
  document.body.append(container);
  expect([...container.querySelectorAll("a")].map((link) => link.className)).toEqual(serverClasses);

  const recoverable: unknown[] = [];
  const consoleErrors: unknown[][] = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => consoleErrors.push(args));
  let root: Root | undefined;

  try {
    await act(async () => {
      root = hydrateRoot(container, <DashboardNavigation/>, {
        onRecoverableError: (error) => recoverable.push(error),
      });
    });

    expect(recoverable).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(container.querySelector(`a[href="${activeHref}"]`)?.getAttribute("aria-current")).toBe("page");
    for (const icon of container.querySelectorAll("svg")) {
      expect(icon.getAttribute("width")).toBe("19");
      expect(icon.getAttribute("height")).toBe("19");
    }
  } finally {
    consoleError.mockRestore();
    await act(async () => root?.unmount());
    container.remove();
  }
}

describe("dashboard navigation routing", () => {
  it("normalizes trailing slashes and matches only complete route segments", () => {
    expect(normalizeDashboardPathname("/dashboard///")).toBe("/dashboard");
    expect(isActiveDashboardRoute("/dashboard", "/dashboard")).toBe(true);
    expect(isActiveDashboardRoute("/dashboard/audience/", "/dashboard/audience")).toBe(true);
    expect(isActiveDashboardRoute("/dashboard/audience-detail", "/dashboard/audience")).toBe(false);
    expect(isActiveDashboardRoute("/dashboard/settings", "/dashboard")).toBe(false);
  });

  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard/audience", "/dashboard/audience"],
    ["/dashboard/audience/", "/dashboard/audience"],
    ["/dashboard/platforms", "/dashboard/platforms"],
    ["/dashboard/analytics/recovery", "/dashboard/analytics/recovery"],
  ])("hydrates %s without changing initial attributes and activates only %s", async (pathname, activeHref) => {
    await expectCleanNavigationHydration(pathname, activeHref);
  });
});
