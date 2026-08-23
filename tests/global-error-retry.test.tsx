// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";

describe("public route transient-error retry", () => {
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    document.body.innerHTML = "";
  });

  it("invokes the Next route reset when Try again is selected", () => {
    const reset = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(<ErrorPage error={new Error("transient")} reset={reset} />));
    const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Try again");
    expect(button).toBeDefined();

    act(() => button?.click());
    expect(reset).toHaveBeenCalledOnce();
  });
});
