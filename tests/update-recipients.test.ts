import { describe, expect, it } from "vitest";
import {
  aggregateExclusionReasons,
  deduplicateRecipients,
  evaluateRecipientEligibility,
  normaliseRecipientEmail,
  resolvePreferenceCategory,
  toDeliveryInsert,
  type RecipientCandidate,
} from "@/lib/update-recipients";
import { broadcastTypes } from "@/lib/updates";

const candidate: RecipientCandidate = {
  connectionId: "connection-1",
  contactId: "contact-1",
  creatorId: "creator-1",
  expectedCreatorId: "creator-1",
  connectionStatus: "active",
  email: "Fan@Example.com",
  emailVerified: true,
  preferenceEnabled: true,
  existingDelivery: false,
};

describe("update recipient resolution", () => {
  it("maps every broadcast type to the canonical preference", () => {
    expect(broadcastTypes.map(resolvePreferenceCategory)).toEqual([
      "videos",
      "announcements",
      "livestreams",
      "announcements",
      "products",
      "recovery",
    ]);
  });

  it("normalises recipient email", () => {
    expect(normaliseRecipientEmail("  FAN@Example.COM ")).toBe("fan@example.com");
  });

  it("excludes an invalid email", () => {
    expect(evaluateRecipientEligibility({ ...candidate, email: "not-an-email" }, "announcement")).toEqual({
      eligible: false,
      reason: "invalid_email",
    });
  });

  it("excludes an inactive connection", () => {
    expect(evaluateRecipientEligibility({ ...candidate, connectionStatus: "deactivated" }, "announcement")).toEqual({
      eligible: false,
      reason: "inactive_connection",
    });
  });

  it("excludes an unsubscribed connection explicitly", () => {
    expect(evaluateRecipientEligibility({ ...candidate, connectionStatus: "unsubscribed" }, "announcement")).toEqual({
      eligible: false,
      reason: "unsubscribed",
    });
  });

  it("excludes a missing email", () => {
    expect(evaluateRecipientEligibility({ ...candidate, email: null }, "announcement")).toEqual({
      eligible: false,
      reason: "missing_email",
    });
  });

  it("excludes an unverified email", () => {
    expect(evaluateRecipientEligibility({ ...candidate, emailVerified: false }, "announcement")).toEqual({
      eligible: false,
      reason: "unverified_email",
    });
  });

  it("excludes a disabled preference", () => {
    expect(evaluateRecipientEligibility({ ...candidate, preferenceEnabled: false }, "announcement")).toEqual({
      eligible: false,
      reason: "preference_disabled",
    });
  });

  it("returns a normalised active eligible recipient", () => {
    expect(evaluateRecipientEligibility(candidate, "announcement")).toEqual({
      eligible: true,
      recipient: {
        connectionId: "connection-1",
        contactId: "contact-1",
        recipientEmail: "fan@example.com",
        preferenceCategory: "announcements",
      },
    });
  });

  it("deduplicates by stable follower connection", () => {
    const eligible = evaluateRecipientEligibility(candidate, "announcement");
    if (!eligible.eligible) throw new Error("fixture must be eligible");
    expect(deduplicateRecipients([eligible.recipient, eligible.recipient])).toEqual({
      recipients: [eligible.recipient],
      duplicates: 1,
    });
  });

  it("uses mandatory recovery for an account update", () => {
    const result = evaluateRecipientEligibility(candidate, "account_update");
    expect(result.eligible && result.recipient.preferenceCategory).toBe("recovery");
  });

  it("aggregates explicit exclusion reasons", () => {
    const evaluations = [
      evaluateRecipientEligibility({ ...candidate, email: null }, "announcement"),
      evaluateRecipientEligibility({ ...candidate, emailVerified: false }, "announcement"),
      evaluateRecipientEligibility({ ...candidate, emailVerified: false }, "announcement"),
    ];
    expect(aggregateExclusionReasons(evaluations)).toEqual({
      missing_email: 1,
      unverified_email: 2,
    });
  });

  it("maps an eligible recipient to a durable delivery insert", () => {
    const eligible = evaluateRecipientEligibility(candidate, "account_update");
    if (!eligible.eligible) throw new Error("fixture must be eligible");
    expect(toDeliveryInsert("update-1", "creator-1", eligible.recipient)).toEqual({
      update_id: "update-1",
      creator_id: "creator-1",
      connection_id: "connection-1",
      contact_id: "contact-1",
      recipient_email: "fan@example.com",
      preference_category: "recovery",
      status: "queued",
    });
  });
});
