import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EmailCard } from "@/components/recovery-pass-flow";

const renderEmail = () => renderToStaticMarkup(
  <EmailCard
    value=""
    onChange={vi.fn()}
    name="Nana"
  />,
);

describe("Recovery Pass email-only direct connection", () => {
  it("renders one required, mobile-friendly Email card without transport selection", () => {
    const html = renderEmail();
    expect(html).toContain("Email address");
    expect(html).toContain("A reliable way for Nana to reach you beyond social platforms.");
    expect(html).toContain('type="email"');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain("SMS");
  });
});
