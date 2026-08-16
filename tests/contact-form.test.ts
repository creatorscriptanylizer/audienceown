import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { processContactSubmission, type ContactEmailSender, type ContactTopic } from "@/lib/contact-form";
import { CONTACT_EMAIL, CONTACT_EMAIL_FROM, SUPPORT_EMAIL, contactTopicDestinations, isContactTopic } from "@/lib/contact-form-contract";

const valid = { topic: "account_sign_in", name: "Nana", email: "nana@example.com", handle: "nana", subject: "Need help", message: "Please help with my account.", website: "" };
const page = readFileSync(resolve("app/contact/page.tsx"), "utf8");
const client = readFileSync(resolve("components/contact-form.tsx"), "utf8");
const route = readFileSync(resolve("app/api/contact/route.ts"), "utf8");

function dependencies(sender: ContactEmailSender | null = vi.fn(async () => ({ id: "email-1" }))) {
  return { sender, from: CONTACT_EMAIL_FROM, allowed: true, now: new Date("2026-08-15T12:00:00.000Z") };
}

describe("Contact & Support", () => {
  it("renders operational mailto fallbacks and removes placeholder branding", () => {
    expect(SUPPORT_EMAIL).toBe("support@audienceown.com");
    expect(CONTACT_EMAIL).toBe("contact@audienceown.com");
    expect(page).toContain("SUPPORT_EMAIL");
    expect(page).toContain("CONTACT_EMAIL");
    expect(page).not.toContain("[SUPPORT EMAIL]");
    expect(page).not.toContain("OwnSignal");
  });

  it.each([
    ["account_sign_in", "support@audienceown.com"],
    ["creator_profile", "support@audienceown.com"],
    ["recovery_pass", "support@audienceown.com"],
    ["recovery_destinations", "support@audienceown.com"],
    ["audience_preferences", "support@audienceown.com"],
    ["platforms_connected_accounts", "support@audienceown.com"],
    ["updates_notifications", "support@audienceown.com"],
    ["identity_authenticity", "support@audienceown.com"],
    ["ecosystem", "support@audienceown.com"],
    ["emergency_mode", "support@audienceown.com"],
    ["recovery_analytics", "support@audienceown.com"],
    ["billing_plan", "support@audienceown.com"],
    ["privacy_request", "contact@audienceown.com"],
    ["security_abuse", "contact@audienceown.com"],
    ["partnership_business", "contact@audienceown.com"],
    ["other", "contact@audienceown.com"],
  ] as const)("routes %s server-side", async (topic, destination) => {
    const sender = vi.fn(async () => ({ id: "email-1" }));
    expect(contactTopicDestinations[topic as ContactTopic]).toBe(destination);
    await expect(processContactSubmission({ ...valid, topic }, dependencies(sender))).resolves.toEqual({ status: "success" });
    expect(sender).toHaveBeenCalledWith(expect.objectContaining({ from: CONTACT_EMAIL_FROM, to: destination, replyTo: valid.email }));
  });

  it("does not accept a client-provided destination override", async () => {
    const sender = vi.fn(async () => ({ id: "email-1" }));
    const result = await processContactSubmission({ ...valid, destination: "attacker@example.com" }, dependencies(sender));
    expect(result.status).toBe("invalid");
    expect(sender).not.toHaveBeenCalled();
  });

  it("rejects invalid email and missing message", async () => {
    await expect(processContactSubmission({ ...valid, email: "invalid", message: "" }, dependencies())).resolves.toMatchObject({ status: "invalid", errors: { email: expect.any(String), message: expect.any(String) } });
  });

  it.each(["name", "email", "handle", "subject"] as const)("rejects line breaks in the %s header field", async (field) => {
    const sender = vi.fn(async () => ({ id: "email-1" }));
    const result = await processContactSubmission({ ...valid, [field]: `${valid[field]}\r\nBcc: attacker@example.com` }, dependencies(sender));
    expect(result.status).toBe("invalid");
    expect(sender).not.toHaveBeenCalled();
  });

  it("normalizes a validated reply address and keeps HTML-like content in plain text", async () => {
    const sender = vi.fn<ContactEmailSender>(async () => ({ id: "email-1" }));
    await expect(processContactSubmission({ ...valid, email: " Nana@Example.COM ", message: "<img src=x onerror=alert(1)>" }, dependencies(sender))).resolves.toEqual({ status: "success" });
    expect(sender).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: "nana@example.com",
      text: expect.stringContaining("<img src=x onerror=alert(1)>"),
    }));
    expect(sender.mock.calls[0]?.[0]).not.toHaveProperty("html");
  });

  it("returns truthful success and provider failure states", async () => {
    await expect(processContactSubmission(valid, dependencies())).resolves.toEqual({ status: "success" });
    await expect(processContactSubmission(valid, dependencies(async () => ({ error: new Error("provider") })))).resolves.toEqual({ status: "unavailable" });
    await expect(processContactSubmission(valid, dependencies(async () => { throw new Error("network"); }))).resolves.toEqual({ status: "unavailable" });
  });

  it("uses a honeypot, same-origin enforcement, and bounded rate limiting", async () => {
    const sender = vi.fn(async () => ({ id: "email-1" }));
    await expect(processContactSubmission({ ...valid, website: "bot.example" }, dependencies(sender))).resolves.toEqual({ status: "success" });
    expect(sender).not.toHaveBeenCalled();
    expect(route).toContain("requireContactOrigin(request)");
    expect(route).toContain("authenticityRateLimit(rateLimitKey(request), 5, 15 * 60_000)");
  });

  it("keeps provider credentials and destination selection out of the client", () => {
    expect(client).not.toMatch(/RESEND_API_KEY|DELIVERY_EMAIL_FROM|RESEND_FROM_EMAIL/);
    expect(client).not.toContain("destination");
    expect(page).not.toMatch(/RESEND_API_KEY|DELIVERY_EMAIL_FROM|RESEND_FROM_EMAIL/);
  });

  it("accepts only known query topics for form preselection", () => {
    expect(isContactTopic("privacy_request")).toBe(true);
    expect(isContactTopic("account_sign_in")).toBe(true);
    expect(isContactTopic("attacker@example.com")).toBe(false);
    expect(isContactTopic(["privacy_request"])).toBe(false);
    expect(page).toContain("isContactTopic(requestedTopic)");
    expect(page).toContain("<ContactForm initialTopic={initialTopic}/>");
  });
});
