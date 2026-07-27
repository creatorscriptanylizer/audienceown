import { describe, expect, it } from "vitest";
import { buildDeliveryMessage, escapeHtml, type ClaimedDelivery } from "@/lib/delivery-message";

const delivery: ClaimedDelivery = {
  delivery_id: "delivery-1",
  update_id: "update-1",
  creator_id: "creator-1",
  transport: "email",
  destination: "fan@example.com",
  attempt_count: 1,
  broadcast_type: "account_update",
  title: "Access update",
  subject: "Your access changed",
  preview_text: "Preview",
  content: "Use <safe> & secure access.\nSecond line.",
  cta_label: "Creator page",
  cta_url: "https://example.com/action?one=1&two=2",
  creator_display_name: "Creator <One>",
  creator_public_slug: "creator-one",
};

describe("delivery message construction", () => {
  it("builds a plain-text fallback with trusted update fields", () => {
    const message = buildDeliveryMessage(delivery, "https://audienceown.example/");
    expect(message.text).toContain("Use <safe> & secure access.");
    expect(message.text).toContain("https://audienceown.example/c/creator-one");
    expect(message.destination).toBe("fan@example.com");
  });

  it("escapes user-authored content before constructing HTML", () => {
    const message = buildDeliveryMessage(delivery, "https://audienceown.example");
    expect(message.html).toContain("Use &lt;safe&gt; &amp; secure access.<br>Second line.");
    expect(message.html).not.toContain("<safe>");
  });

  it("escapes all HTML-sensitive characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
