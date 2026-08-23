// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  listFactors: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  refreshSession: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth: { mfa: { listFactors: auth.listFactors, enroll: auth.enroll, unenroll: auth.unenroll, challenge: auth.challenge, verify: auth.verify, getAuthenticatorAssuranceLevel: auth.getAuthenticatorAssuranceLevel }, getSession: auth.getSession, getUser: auth.getUser, refreshSession: auth.refreshSession } }) }));
vi.mock("qrcode.react", () => ({ QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr">{value}</div> }));

import { MfaPanel } from "@/components/mfa-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function renderPanel(debug = false) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<MfaPanel debug={debug}/>); });
}

function button(label: string) {
  return [...container.querySelectorAll("button")].find((item) => item.textContent?.includes(label));
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.listFactors.mockResolvedValue({ data: { all: [], totp: [] }, error: null });
  auth.unenroll.mockResolvedValue({ data: {}, error: null });
  auth.enroll.mockResolvedValue({ data: { id: "new-factor", totp: { uri: "otpauth-safe-test", secret: "test-secret" } }, error: null });
  auth.challenge.mockResolvedValue({ data: { id: "challenge" }, error: null });
  auth.verify.mockResolvedValue({ data: {}, error: null });
  auth.getSession.mockResolvedValue({ data: { session: {} }, error: null });
  auth.getUser.mockResolvedValue({ data: { user: {} }, error: null });
  auth.refreshSession.mockResolvedValue({ data: { session: {} }, error: null });
  auth.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
});

describe("MfaPanel", () => {
  it("removes only stale unverified TOTP factors before starting enrollment", async () => {
    auth.listFactors
      .mockResolvedValueOnce({ data: { all: [], totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { all: [{ id: "pending", factor_type: "totp", status: "unverified" }], totp: [] }, error: null });
    await renderPanel();
    await act(async () => { button("Set up authenticator")?.click(); });
    expect(auth.unenroll).toHaveBeenCalledWith({ factorId: "pending" });
    expect(auth.enroll).toHaveBeenCalledWith({ factorType: "totp", friendlyName: "AudienceOwn authenticator" });
    expect(container.textContent).toContain("Scan this code");
  });

  it("does not create another factor when a verified authenticator exists", async () => {
    auth.listFactors.mockResolvedValue({ data: { all: [{ id: "verified", factor_type: "totp", status: "verified", friendly_name: "Authenticator" }], totp: [] }, error: null });
    await renderPanel();
    expect(container.textContent).toContain("Enabled");
    expect(button("Set up authenticator")).toBeUndefined();
    expect(auth.enroll).not.toHaveBeenCalled();
  });

  it("keeps an enrollment retryable after an invalid code", async () => {
    auth.verify.mockResolvedValue({ data: null, error: { code: "mfa_verification_failed", status: 422 } });
    await renderPanel();
    await act(async () => { button("Set up authenticator")?.click(); });
    const input = container.querySelector<HTMLInputElement>("#totp")!;
    await act(async () => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; setter?.call(input, "000000"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => { button("Verify and enable")?.click(); });
    expect(container.textContent).toContain("That code was not accepted");
    expect(container.textContent).toContain("Scan this code");
  });

  it("refreshes a stale session and continues enrollment with the same browser client", async () => {
    auth.getUser
      .mockResolvedValueOnce({ data: { user: null }, error: { code: "session_not_found", status: 401 } })
      .mockResolvedValueOnce({ data: { user: {} }, error: null });
    await renderPanel();
    await act(async () => { button("Set up authenticator")?.click(); });
    expect(auth.refreshSession).toHaveBeenCalledOnce();
    expect(auth.getUser).toHaveBeenCalledTimes(2);
    expect(auth.enroll).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Scan this code");
  });

  it("offers account-preserving reauthentication when session refresh fails", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError", code: "session_not_found", status: 401 } });
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { code: "refresh_token_not_found", status: 401 } });
    await renderPanel();
    await act(async () => { button("Set up authenticator")?.click(); });
    expect(auth.enroll).not.toHaveBeenCalled();
    expect(container.textContent).toContain("session needs to be refreshed");
    expect(container.querySelector<HTMLAnchorElement>('a[href="/login?next=%2Fdashboard%2Fsettings%2Faccount"]')?.textContent).toContain("Re-authenticate");
  });

  it("reports getSession and getUser outcomes separately without credential material", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: "session_not_found", status: 401 } });
    await renderPanel(true);
    await act(async () => { button("Set up authenticator")?.click(); });
    const output = JSON.stringify(info.mock.calls);
    expect(output).toContain('"sessionPresent":true');
    expect(output).toContain('"userPresent":false');
    expect(output).toContain('"getSessionErrorCode":null');
    expect(output).toContain('"refreshAttempted":true');
    expect(output).toContain('"refreshSucceeded":true');
    expect(output).toContain('"getUserErrorCode":"session_not_found"');
    expect(output).not.toContain("access_token");
    expect(output).not.toContain("refresh_token");
    info.mockRestore();
  });

  it("verifies pending-factor cleanup before enrolling", async () => {
    const pending = { id: "pending", factor_type: "totp", status: "unverified" };
    auth.listFactors
      .mockResolvedValueOnce({ data: { all: [], totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { all: [pending], totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { all: [pending], totp: [] }, error: null });
    await renderPanel();
    await act(async () => { button("Set up authenticator")?.click(); });
    expect(auth.unenroll).toHaveBeenCalledOnce();
    expect(auth.enroll).not.toHaveBeenCalled();
    expect(container.textContent).toContain("could not be reset cleanly");
  });

  it("logs only safe enrollment-result metadata in debug mode", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await renderPanel(true);
    await act(async () => { button("Set up authenticator")?.click(); });
    const output = JSON.stringify(info.mock.calls);
    expect(output).toContain('"stage":"mfa_enroll"');
    expect(output).toContain('"hasSecret":true');
    expect(output).not.toContain("otpauth-safe-test");
    expect(output).not.toContain("test-secret");
    expect(output).not.toContain("new-factor");
    info.mockRestore();
  });
});
