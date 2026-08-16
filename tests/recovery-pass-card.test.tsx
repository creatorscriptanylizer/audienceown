// @vitest-environment jsdom

import { act } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecoveryPassCard } from "@/components/dashboard/recovery-pass-card";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("RecoveryPassCard hydration", () => {
  it("keeps the readable typography after hydration", async () => {
    const recoveryPass = {
      exists: true,
      active: false,
      canonicalUrl: "https://audienceown.example/creator",
      displayUrl: "audienceown.example/creator",
      href: "/creator",
    };
    const server = renderToString(<RecoveryPassCard recoveryPass={recoveryPass}/>);
    const container = document.createElement("div");
    container.innerHTML = server;
    document.body.append(container);

    const eyebrow = [...container.querySelectorAll("p")].find((element) => element.textContent === "Your Recovery Pass");
    const status = [...container.querySelectorAll("span")].find((element) => element.textContent === "Ready");
    const description = [...container.querySelectorAll("p")].find((element) => element.textContent?.startsWith("Share this link"));
    const url = [...container.querySelectorAll("span")].find((element) => element.textContent === recoveryPass.displayUrl);
    expect(eyebrow?.className).toBe("text-sm font-semibold uppercase tracking-[.16em] text-violet-300");
    expect(status?.className).toBe("inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300");
    expect(description?.className).toBe("mt-1 text-base leading-[1.6] text-zinc-300");
    expect(url?.className).toContain("text-base");

    const recoverable: unknown[] = [];
    const consoleErrors: unknown[][] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => consoleErrors.push(args));
    let root: Root | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(container, <RecoveryPassCard recoveryPass={recoveryPass}/>, {
          onRecoverableError: (error) => recoverable.push(error),
        });
      });

      expect(recoverable).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(eyebrow?.className).not.toContain("text-[10px]");
      expect(status?.className).not.toContain("text-xs");
      expect(description?.className.split(" ")).not.toContain("text-sm");
      expect(url?.className.split(" ")).not.toContain("text-sm");
      expect(eyebrow?.className).toBe("text-sm font-semibold uppercase tracking-[.16em] text-violet-300");
      expect(status?.className).toBe("inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300");
      expect(description?.className).toBe("mt-1 text-base leading-[1.6] text-zinc-300");
      expect(url?.className).toContain("text-base");
    } finally {
      consoleError.mockRestore();
      await act(async () => root?.unmount());
      container.remove();
    }
  });
});
