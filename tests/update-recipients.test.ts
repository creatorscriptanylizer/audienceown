import { describe, expect, it } from "vitest";
import {
  aggregateExclusionReasons,
  aggregateRecipientsByTransport,
  createDeliveryInsert,
  deduplicateRecipients,
  evaluateRecipientEligibilities,
  evaluateRecipientEligibility,
  normaliseEmail,
  normalisePhoneNumber,
  recoveryMethodTypeToTransport,
  resolveRecoveryTransport,
  type RecipientCandidate,
  type RecoveryDestination,
} from "@/lib/update-recipients";

function destination(
  methodType: string,
  value: string | null,
  overrides: Partial<RecoveryDestination> = {},
): RecoveryDestination {
  return {
    recoveryMethodId: `method-${methodType}`,
    contactId: "contact-1",
    methodType,
    value,
    destinationHash: methodType === "web_push" ? null : `hash-${methodType}`,
    verified: true,
    active: true,
    ...overrides,
  };
}

const destinations = [
  destination("email", "Fan@Example.com"),
  destination("sms", "+44 7700 900123"),
  destination("whatsapp", "+44 7700 900123"),
  destination("web_push", "subscription-reference"),
];

const base: RecipientCandidate = {
  connectionId: "connection-1",
  contactId: "contact-1",
  creatorId: "creator-1",
  expectedCreatorId: "creator-1",
  connectionStatus: "active",
  selectedRecoveryMethodId: "method-email",
  destinations,
  preferenceEnabled: true,
  existingTransports: [],
};

describe("transport-aware recipient resolution", () => {
  it.each([
    ["email", "email"],
    ["sms", "sms"],
    ["whatsapp", "whatsapp"],
    ["web_push", "browser_notification"],
    ["passkey", null],
  ] as const)("maps %s recovery methods to %s", (methodType, expected) => {
    expect(recoveryMethodTypeToTransport(methodType)).toBe(expected);
  });

  it.each([
    ["method-email", "email"],
    ["method-sms", "sms"],
    ["method-whatsapp", "whatsapp"],
    ["method-web_push", "browser_notification"],
  ] as const)("selects the exact %s recovery method", (selectedId, expected) => {
    const selected = destinations.find((method) => method.recoveryMethodId === selectedId) ?? null;
    expect(resolveRecoveryTransport("account_update", selected)).toBe(expected);
  });

  it("uses the selected verified transport for regular broadcasts", () => {
    expect(resolveRecoveryTransport("announcement", destinations[1])).toBe("sms");
  });

  it("normalises email", () => {
    expect(normaliseEmail(" FAN@Example.COM ")).toBe("fan@example.com");
  });

  it("normalises E.164 phone input", () => {
    expect(normalisePhoneNumber("00 44 (7700) 900-123")).toBe("+447700900123");
  });

  it("rejects an invalid email", () => {
    expect(evaluateRecipientEligibility({
      ...base,
      destinations: [destination("email", "invalid")],
    }, "account_update")).toMatchObject({ eligible: false, reason: "invalid_destination" });
  });

  it("rejects an invalid phone", () => {
    expect(evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId: "method-sms",
      destinations: [destination("sms", "555")],
    }, "account_update")).toMatchObject({ eligible: false, reason: "invalid_destination" });
  });

  it("excludes a missing selected method", () => {
    expect(evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId: "missing-method",
    }, "account_update")).toMatchObject({ eligible: false, reason: "missing_recovery_method" });
  });

  it("rejects a selected method belonging to another contact", () => {
    expect(evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId: "other-contact-method",
      destinations: [
        destination("sms", "+447700900123", {
          recoveryMethodId: "other-contact-method",
          contactId: "contact-2",
        }),
      ],
    }, "account_update")).toMatchObject({ eligible: false, reason: "missing_recovery_method" });
  });

  it("excludes an unverified selected method", () => {
    expect(evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId: "method-whatsapp",
      destinations: [destination("whatsapp", "+447700900123", { verified: false })],
    }, "account_update")).toMatchObject({ eligible: false, reason: "unverified_destination" });
  });

  it("excludes an inactive browser subscription", () => {
    expect(evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId: "method-web_push",
      destinations: [destination("web_push", "subscription-reference", { active: false })],
    }, "account_update")).toMatchObject({
      eligible: false,
      reason: "inactive_browser_subscription",
    });
  });

  it("does not substitute another method of the same type", () => {
    expect(evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId: "selected-sms",
      destinations: [
        destination("sms", null, { recoveryMethodId: "selected-sms" }),
        destination("sms", "+447700900123", { recoveryMethodId: "other-sms" }),
        destination("email", "fan@example.com"),
      ],
    }, "account_update")).toMatchObject({ eligible: false, reason: "missing_destination" });
  });

  it("rejects an unsupported selected method", () => {
    expect(evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId: "method-passkey",
      destinations: [destination("passkey", null)],
    }, "account_update")).toMatchObject({ eligible: false, reason: "unsupported_transport" });
  });

  it("uses the verified selected SMS route for an eligible regular broadcast", () => {
    const result = evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId: "method-sms",
      destinations: [
        destination("email", "stale@example.com", {
          recoveryMethodId: "unverified-email",
          verified: false,
        }),
        ...destinations,
      ],
    }, "announcement");
    expect(result.eligible && result.recipient).toMatchObject({
      transport: "sms",
      recoveryMethodId: "method-sms",
    });
  });

  it("supplements optional Update Email with every active Push device", () => {
    const results = evaluateRecipientEligibilities({
      ...base,
      destinations: [
        destination("email", "fan@example.com"),
        destination("web_push", "push-one", { recoveryMethodId: "push-one" }),
        destination("web_push", "push-two", { recoveryMethodId: "push-two" }),
      ],
    }, "announcement");
    expect(results.flatMap((result) => result.eligible ? [result.recipient.transport] : [])).toEqual([
      "email", "browser_notification", "browser_notification",
    ]);
  });

  it("keeps optional Update Email eligible when Push is inactive", () => {
    const results = evaluateRecipientEligibilities({
      ...base,
      destinations: [
        destination("email", "fan@example.com"),
        destination("web_push", null, { active: false }),
      ],
    }, "announcement");
    expect(results).toHaveLength(1);
    expect(results[0].eligible && results[0].recipient.transport).toBe("email");
  });

  it("does not add Push to mandatory recovery alerts", () => {
    const results = evaluateRecipientEligibilities(base, "account_update");
    expect(results).toHaveLength(1);
    expect(results[0].eligible && results[0].recipient.transport).toBe("email");
  });

  it("deduplicates by relationship and transport", () => {
    const result = evaluateRecipientEligibility(base, "account_update");
    if (!result.eligible) throw new Error("fixture must be eligible");
    expect(deduplicateRecipients([result.recipient, result.recipient]).duplicates).toBe(1);
  });

  it("aggregates transport counts", () => {
    const recipients = (["email", "sms", "whatsapp", "browser_notification"] as const).map((transport, index) => ({
      connectionId: `connection-${index}`,
      contactId: `contact-${index}`,
      recoveryMethodId: `method-${index}`,
      transport,
      destination: transport === "email" ? "fan@example.com" : transport === "browser_notification" ? "ref" : "+447700900123",
      destinationHash: transport === "browser_notification" ? null : "hash",
      preferenceCategory: "recovery" as const,
    }));
    expect(aggregateRecipientsByTransport(recipients)).toEqual({
      email: 1,
      sms: 1,
      whatsapp: 1,
      browser_notification: 1,
    });
  });

  it("keeps account updates on mandatory recovery preference", () => {
    const result = evaluateRecipientEligibility(base, "account_update");
    expect(result.eligible && result.recipient.preferenceCategory).toBe("recovery");
  });

  it.each([
    ["method-email", "email"],
    ["method-sms", "sms"],
    ["method-whatsapp", "whatsapp"],
    ["method-web_push", "browser_notification"],
  ] as const)("maps the selected method to a %s insert", (selectedRecoveryMethodId, transport) => {
    const result = evaluateRecipientEligibility({
      ...base,
      selectedRecoveryMethodId,
    }, "account_update");
    if (!result.eligible) throw new Error(`${transport} fixture must be eligible`);
    expect(createDeliveryInsert("update-1", "creator-1", result.recipient)).toMatchObject({
      update_id: "update-1",
      creator_id: "creator-1",
      connection_id: "connection-1",
      transport,
      recovery_method_id: selectedRecoveryMethodId,
      preference_category: "recovery",
      status: "queued",
    });
  });

  it("aggregates exact-method exclusions", () => {
    const evaluations = [
      evaluateRecipientEligibility({ ...base, selectedRecoveryMethodId: null }, "account_update"),
      evaluateRecipientEligibility({
        ...base,
        selectedRecoveryMethodId: "method-sms",
        destinations: [destination("sms", null)],
      }, "account_update"),
    ];
    expect(aggregateExclusionReasons(evaluations)).toEqual({
      missing_recovery_method: 1,
      missing_destination: 1,
    });
  });
});
