import { existsSync, readFileSync } from "node:fs";
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
const profile = read("app/dashboard/settings/profile/page.tsx");
const recoveryPass = read("app/dashboard/settings/recovery-pass/page.tsx");
const plans = read("app/dashboard/settings/plans/page.tsx");
const mfa = read("components/mfa-panel.tsx");
const loading = read("app/dashboard/settings/loading.tsx");
const creatorActions = read("app/actions/creator.ts");

describe("settings product readiness", () => {
  it("keeps the Settings stylesheet import resolvable", () => {
    const layout = read("app/dashboard/settings/layout.tsx");
    expect(layout).toContain('import "./settings-workspace.css"');
    expect(existsSync(resolve("app/dashboard/settings/settings-workspace.css"))).toBe(true);
  });
  it("provides a supported, accessible settings information architecture", () => {
    for (const label of ["Overview", "Profile", "Account & Security", "Connected Platforms", "Recovery Pass", "Plans & Billing"]) expect(navigation).toContain(label);
    expect(navigation).not.toContain('label: "Security"');
    expect(navigation).toContain('aria-label="Settings"');
    expect(navigation).toContain('aria-current={current ? "page" : undefined}');
    expect(navigation).toContain("overflow-x-auto");
    expect(navigation).toContain("xl:sticky");
    expect(overview).toContain("Creator notifications");
    expect(overview).toContain('href="/dashboard/settings/plans"');
    expect(overview).not.toContain("BillingStatusPanel");
    expect(plans).toContain("PlansBillingWorkspace");
    expect(plans).toContain("readCanonicalPricing");
  });

  it("shows truthful account and security status", () => {
    expect(account).toContain("Account created");
    expect(account).toContain("Most recent sign-in");
    expect(account).toContain("Google Sign-In and a YouTube connection are separate");
    expect(account).not.toContain("Current browser session");
    expect(account).not.toContain("Active session management across other devices is not available");
    expect(account).toContain("MfaPanel");
    expect(security).toContain('redirect("/dashboard/settings/account")');
    expect(mfa).toContain("No authenticator app is enrolled");
    expect(mfa).toContain("Confirm authenticator removal");
    expect(mfa).toContain("data?.all");
    expect(mfa).toContain('factor.status === "unverified"');
    expect(mfa).toContain("pending-factor-cleanup");
    expect(mfa).not.toContain("error.message");
  });

  it("keeps profile and Recovery Pass inside the settings workspace", () => {
    expect(profile).toContain("CreatorForm");
    expect(profile).toContain("canonical identity");
    expect(recoveryPass).toContain("Current status");
    expect(recoveryPass).toContain("recovery_pass_enabled");
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
