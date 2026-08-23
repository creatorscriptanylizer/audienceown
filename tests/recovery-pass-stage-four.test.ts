import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const flow = readFileSync(`${root}/components/recovery-pass-flow.tsx`, "utf8");
const styles = readFileSync(`${root}/components/recovery-pass-flow.css`, "utf8");
const route = readFileSync(`${root}/app/api/public/recovery-pass/activate/route.ts`, "utf8");
const pushRoute = readFileSync(`${root}/app/api/public/recovery-pass/push/route.ts`, "utf8");
const pushMigration = readFileSync(`${root}/supabase/migrations/20260929000000_optional_update_push_supplement.sql`, "utf8");

describe("Recovery Pass Stage 4", () => {
  it("makes recovery alerts selected, visible, and required", () => {
    expect(flow).toContain("useState(true)");
    expect(flow).toContain("stage === 4 ? recoveryAlerts");
    expect(flow).toContain("checked={recoveryAlerts} required");
    expect(flow).toContain("Recovery alerts are required because they&apos;re what allow");
    expect(route).toContain("recoveryAlerts: z.literal(true)");
  });

  it("uses the approved dynamic recovery and optional-update copy", () => {
    expect(flow).toContain("Stay connected when it matters most. If one of {name}&apos;s accounts is hacked, banned, impersonated, moved, or becomes unavailable");
    expect(flow).toContain("How else would you like to hear from {name}?");
    expect(flow).toContain("Select as many as you want, or skip them entirely.");
    expect(flow).toContain("when ${name} shares something new to watch.");
    expect(flow).toContain("when ${name} goes live so you can join them in the moment.");
    expect(flow).toContain("when ${name} releases a new conversation or episode.");
    expect(flow).toContain("what ${name} launches next.");
    expect(flow).toContain("updates ${name} wants to share with their community.");
  });

  it("keeps all optional defaults empty and maps every canonical category once", () => {
    expect(flow).toContain("useState<RecoveryPassCategory[]>([])");
    for (const category of ["videos", "livestreams", "podcasts", "products", "events", "announcements"]) {
      expect(flow).toContain(`${category}: {`);
      expect(styles).toContain(`[data-category=${category}]`);
    }
    expect(flow).toContain('empty="No optional updates selected"');
  });

  it("preserves saved member preferences and gives each card an accessible checkbox", () => {
    expect(flow).toContain("RECOVERY_PASS_CATEGORIES.filter((key) => memberState.preferences[key])");
    expect(flow).toContain('type="checkbox" checked={preferences.includes(key)}');
    expect(styles).toContain("label:has(input:focus-visible)");
  });

  it("offers Push only after an optional category is selected", () => {
    expect(flow).toContain("preferences.length > 0 && <PushCard");
    expect(flow).toContain("Enable push notifications");
    expect(flow).toContain("without waiting for Email.");
    expect(flow).not.toContain("Notification.requestPermission");
  });

  it("persists Push separately without replacing the selected Email method", () => {
    expect(pushRoute).toContain('method_type: "web_push"');
    expect(pushRoute).toContain("browser_push_subscriptions");
    expect(pushRoute).not.toContain("selected_recovery_method_id");
    expect(pushRoute).toContain("push_subscription_registered");
    expect(pushRoute).not.toMatch(/endpoint[^\n]*(debugLog|console)/);
  });

  it("queues optional Push per device while excluding recovery-alert Push", () => {
    expect(pushMigration).toContain("unique(update_id, connection_id, recovery_method_id)");
    expect(pushMigration).toContain("update_row.broadcast_type<>'account_update'");
    expect(pushMigration).toContain("method.method_type='web_push'");
  });
});
