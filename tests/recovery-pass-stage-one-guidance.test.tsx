import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecoveryPassFlow } from "@/components/recovery-pass-flow";

const creator = {
  handle: "alex",
  displayName: "Alex",
  verified: true,
  recoveryPassPublished: true,
  emergencyMode: false,
  lastVerifiedAt: "2026-08-20T00:00:00.000Z",
  recoveryCoreFans: 0,
  officialLinks: [],
  recoveryRoutes: {},
};
const accounts = [
  { reference: "a".repeat(64), provider: "youtube", label: "Alex Main", handle: "alex-main", profileUrl: "https://youtube.com/@alex-main", role: "main" as const },
  { reference: "b".repeat(64), provider: "instagram", label: "Alex Recovery", handle: "alex-recovery", profileUrl: "https://instagram.com/alex-recovery", role: "recovery" as const },
];

describe("Recovery Pass Stage 1 Recovery guidance", () => {
  const html = renderToStaticMarkup(<RecoveryPassFlow creator={creator} accounts={accounts} />);
  const guidance = "Don’t let one account be your only way back to Alex. Add trusted Recovery accounts so you can always find Alex if a Main account is ever hacked, banned, lost, or unavailable.";
  const continuity = "The more trusted connections you add, the harder it is to lose touch.";
  const introduction = "Complete your Recovery Pass to stay connected with Alex, even if one of their accounts is hacked, banned, lost, or becomes unavailable.";

  it("uses the approved dynamic Stage 1 introduction", () => {
    expect(html).toContain(introduction);
    expect(html).not.toContain("Select the account or accounts where you already know Alex.");
  });

  it("renders the Recovery heading, safety-network label, and dynamic guidance once", () => {
    expect(html).toContain("Recovery accounts");
    expect(html).toContain("Your safety network");
    expect(html).toContain(guidance);
    expect(html.match(/Don’t let one account be your only way back/g)).toHaveLength(1);
    expect(html.match(/The more trusted connections you add/g)).toHaveLength(1);
  });

  it("places guidance and the trusted-connections line before Recovery cards", () => {
    const guidanceIndex = html.indexOf(guidance);
    const continuityIndex = html.indexOf(continuity);
    const recoveryCardIndex = html.indexOf("alex-recovery");
    expect(guidanceIndex).toBeGreaterThan(-1);
    expect(continuityIndex).toBeGreaterThan(guidanceIndex);
    expect(recoveryCardIndex).toBeGreaterThan(continuityIndex);
  });

  it("preserves multi-select inputs and the disabled zero-selection Continue state", () => {
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html.match(/class="rp-choice-check"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Select YouTube alex-main Main account"');
    expect(html).toContain('aria-label="Select Instagram alex-recovery Recovery account"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Continue/);
  });

  it("uses the shared information-panel typography and provider-aware icons", () => {
    expect(html).toContain('class="rp-info-body"');
    expect(html).toContain('data-provider="youtube"');
    expect(html).toContain('data-provider="instagram"');
    expect(html).toContain('color:#e11d2e');
  });

  it("uses the shared Stage 4 circular selector without changing provider identity", () => {
    const styles = readFileSync("components/recovery-pass-flow.css", "utf8");
    expect(styles).toContain(".rp-account{grid-template-columns:auto minmax(0,1fr) auto}");
    expect(styles).toContain(".selected>.rp-choice-check");
    expect(styles).toContain("border-color:#6b43e6;background:#6b43e6;color:#fff");
    expect(html).toContain('data-provider="youtube"');
    expect(html).toContain('data-provider="instagram"');
  });
});
