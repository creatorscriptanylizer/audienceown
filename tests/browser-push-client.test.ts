import { afterEach, describe, expect, it, vi } from "vitest";
import {
  browserPushSupport,
  enableBrowserPush,
  vapidPublicKeyToBytes,
} from "@/lib/browser-push-client";

afterEach(() => vi.unstubAllGlobals());

describe("browser push client", () => {
  it("reports unsupported without prompting", async () => {
    vi.stubGlobal("navigator", {});
    expect(browserPushSupport()).toEqual({ supported: false, permission: "unsupported" });
    await expect(enableBrowserPush("unused")).resolves.toEqual({ ok: false, code: "unsupported" });
  });

  it("does not repeatedly prompt after permission is denied", async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { permission: "denied", requestPermission });
    vi.stubGlobal("PushManager", class {});
    vi.stubGlobal("window", { PushManager: class {}, Notification });
    vi.stubGlobal("navigator", { serviceWorker: {} });
    await expect(enableBrowserPush("unused")).resolves.toEqual({
      ok: false,
      code: "permission_denied",
    });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("rejects malformed VAPID keys safely", () => {
    expect(() => vapidPublicKeyToBytes("not a vapid key")).toThrow("invalid_vapid_key");
  });
});
