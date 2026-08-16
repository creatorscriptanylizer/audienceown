import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const navigation = read("components/settings-navigation.tsx");
const overview = read("app/dashboard/settings/page.tsx");
const account = read("app/dashboard/settings/account/page.tsx");
const deletion = read("components/account-deletion-form.tsx");
const connected = read("app/dashboard/settings/connected-accounts/page.tsx");
const connectedCard = read("components/connected-platform-card.tsx");
const youtube = read("components/youtube-connection-manager.tsx");
const security = read("app/dashboard/security/page.tsx");
const mfa = read("components/mfa-panel.tsx");
const loading = read("app/dashboard/settings/loading.tsx");
const creatorActions = read("app/actions/creator.ts");

describe("settings product readiness", () => {
  it("provides a supported, accessible settings information architecture", () => {
    for (const label of ["Overview", "Profile", "Account", "Security", "Connected Platforms", "Recovery Pass"]) expect(navigation).toContain(label);
    expect(navigation).toContain('aria-label="Settings"');
    expect(navigation).toContain('aria-current={current ? "page" : undefined}');
    expect(navigation).toContain("overflow-x-auto");
    expect(navigation).toContain("xl:sticky");
    expect(overview).toContain("Creator notifications");
    expect(overview).toContain("BillingStatusPanel");
    expect(overview).toContain("readBillingRecord");
  });

  it("shows truthful account and security status", () => {
    expect(account).toContain("Account created");
    expect(account).toContain("Most recent sign-in");
    expect(account).toContain("Google Sign-In and a YouTube connection are separate");
    expect(account).toContain("Active session management across other devices is not available");
    expect(security).toContain("Viewing or revoking sessions on other devices is not currently available");
    expect(mfa).toContain("No authenticator app is enrolled");
    expect(mfa).toContain("Confirm authenticator removal");
    expect(mfa).not.toContain("error.message");
  });

  it("distinguishes OAuth connections from manual public accounts", () => {
    expect(connected).toContain("getCreatorProviderAccounts");
    expect(connectedCard).toContain('automatic?"OAuth connection":"Manual account"');
    expect(connected).toContain("providerAuthorizationLabel");
    expect(connected).toContain("Connect your first platform");
    expect(connectedCard).toContain("Edit or remove");
    expect(youtube).toContain("separate from Google Sign-In");
    expect(youtube).toContain("Read-only access");
    expect(youtube).toContain("youtube.readonly");
    expect(youtube).not.toContain("{connection.last_connection_error}");
  });

  it("uses confirmations and accurate failure feedback for destructive actions", () => {
    expect(youtube).toContain('aria-labelledby="youtube-disconnect-title"');
    expect(youtube).toContain('disconnect("keep_manual")');
    expect(youtube).toContain('disconnect("remove_account")');
    expect(youtube).toContain("Google revocation is still pending");
    expect(deletion).toContain('aria-describedby="account-deletion-description"');
    expect(deletion).toContain("Your account remains available");
    expect(deletion).toContain('role="alert"');
  });

  it("provides loading, pending, success, error, and cache-consistency signals", () => {
    expect(loading).toContain('aria-label="Loading settings"');
    expect(loading).toContain("motion-reduce:animate-none");
    expect(youtube).toContain("Disconnecting…");
    expect(mfa).toContain("Authenticator enabled.");
    expect(creatorActions.replace(/\s+/g, "")).toContain('success:"Profileupdated."');
    for (const route of ["/dashboard", "/dashboard/settings", "/dashboard/creator-page"]) expect(creatorActions).toContain(`revalidatePath("${route}")`);
  });
});
