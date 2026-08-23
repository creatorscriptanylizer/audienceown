import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlertMessagePreview } from "@/components/broadcast-studio/broadcast-studio";
import { alertComposerDefinitions, type BroadcastIntent } from "@/lib/broadcast-studio";

const intents: BroadcastIntent[] = [
  "new_video", "livestream", "podcast_episode", "product_release", "event",
  "general_announcement", "community_update", "account_inaccessible", "platform_migration",
];

function render(intent: BroadcastIntent, overrides: Partial<React.ComponentProps<typeof AlertMessagePreview>> = {}) {
  return renderToStaticMarkup(<AlertMessagePreview
    composer={alertComposerDefinitions[intent]}
    title={`${intent} creator title`}
    subject={`${intent} creator subject`}
    previewText={`${intent} creator preview`}
    message={`${intent} creator message`}
    buttonLabel={`${intent} creator button`}
    destinationUrl={`https://example.com/${intent}`}
    {...overrides}
  />);
}

describe("dynamic shared alert message preview", () => {
  it.each(intents)("renders every saved field for %s", (intent) => {
    const html = render(intent);
    for (const field of ["title", "subject", "preview", "message", "button"]) {
      expect(html).toContain(`${intent} creator ${field}`);
    }
    expect(html).toContain(`href="https://example.com/${intent}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("maps the canonical livestream fixture without leaking empty-field placeholders", () => {
    const html = render("livestream", {
      title: "how to ake money", subject: "my card", previewText: "", message: "hgv",
      buttonLabel: "watch now", destinationUrl: "https://www.youtube.com/watch?v=Lpi9i502q_0",
    });
    for (const value of ["how to ake money", "my card", "hgv", "watch now"]) expect(html).toContain(value);
    expect(html).not.toContain("Add context before they open it");
    expect(html).toContain("https://www.youtube.com/watch?v=Lpi9i502q_0");
  });

  it("renders preview text only when the creator saved it", () => {
    expect(render("livestream", { previewText: "Going live in five minutes" })).toContain("Going live in five minutes");
    expect(render("livestream", { previewText: "" })).not.toContain("alert-preview-preheader");
  });

  it("preserves creator CTA casing and omits incomplete or unsafe CTAs", () => {
    expect(render("livestream", { buttonLabel: "Join me live" })).toContain(">Join me live<");
    expect(render("general_announcement", { buttonLabel: "", destinationUrl: "" })).not.toContain("<a ");
    expect(render("event", { destinationUrl: "javascript:alert(1)" })).not.toContain("<a ");
  });

  it("escapes creator-authored text instead of interpreting HTML", () => {
    const html = render("community_update", { title: "<script>alert(1)</script>", message: "<b>safe text</b>" });
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;safe text&lt;/b&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>safe text</b>");
  });

  it("loads review from the persisted draft after Continue to review", () => {
    const page = readFileSync("app/dashboard/updates/[id]/page.tsx", "utf8");
    const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
    expect(page).toContain("title,subject,preview_text,content,cta_label,cta_url");
    expect(page).toContain('initialReview={query.review === "1"}');
    expect(actions).toContain('redirect(`/dashboard/updates/${id}${continueToReview ? "?review=1" : ""}`)');
  });
});
