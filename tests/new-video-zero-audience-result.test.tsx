import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ZeroAudienceSendResult } from "@/components/broadcast-studio/broadcast-studio";

const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");
const delivery = readFileSync("lib/update-delivery.ts", "utf8");

describe("New Video zero-audience send result", () => {
  it("returns a canonical structured result while keeping the update as a draft", () => {
    expect(actions).toContain('kind: "zero_audience"');
    expect(actions).toContain("const audienceCopy = getAlertAudienceCopyDefinition(values.broadcast_intent)");
    expect(actions).toContain('operation: scheduledFor ? "schedule" : "publish"');
    expect(actions).toContain('"Your draft is saved and nothing was sent."');
    expect(delivery.indexOf('throw new PublicationError("zero_audience")')).toBeLessThan(delivery.indexOf('rpc("publish_update_delivery_queue"'));
  });

  it("renders the prominent amber inline result with the canonical copy", () => {
    const html = renderToStaticMarkup(<ZeroAudienceSendResult/>);
    expect(html).toContain("studio-focus-note is-warning new-video-zero-audience-result");
    expect(html).toContain('role="status"');
    expect(html).toContain("No followers are currently opted in to receive video updates.");
    expect(html).toContain("Your draft is saved and nothing was sent.");
  });

  it("replaces the send action with safe draft and canonical Recovery Pass actions", () => {
    expect(studio).toContain("finalResultVisible ?");
    expect(studio).toContain("Back to draft");
    expect(studio).toContain("View Recovery Pass");
    expect(studio).toContain('href={`/c/${creator.publicSlug}`}');
  });

  it("preserves the existing eligible-audience success redirect", () => {
    expect(actions).toContain("summary = await publishDeliveryQueue");
    expect(actions).toContain('redirect(`/dashboard/updates/${id}?${query}`)');
  });
});
