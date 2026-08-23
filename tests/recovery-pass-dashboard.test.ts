import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { canonicalRecoveryPassUrl, displayRecoveryPassUrl } from "@/lib/recovery-pass";
import { copyRecoveryPassLink, shareRecoveryPassLink } from "@/lib/recovery-pass-client";

describe("dashboard Recovery Pass behavior",()=>{
  it("uses a public canonical URL even in local development",()=>{expect(canonicalRecoveryPassUrl("http://localhost:3000","creator name")).toBe("https://audienceown.com/creator%20name");expect(displayRecoveryPassUrl("http://localhost:3000","creator")).toBe("audienceown.com/creator")});
  it("copies and shares the exact canonical URL",async()=>{const writeText=vi.fn().mockResolvedValue(undefined),share=vi.fn().mockResolvedValue(undefined);vi.stubGlobal("navigator",{clipboard:{writeText},share});const url="https://audienceown.com/creator";await copyRecoveryPassLink(url);await expect(shareRecoveryPassLink(url)).resolves.toBe("shared");expect(writeText).toHaveBeenCalledWith(url);expect(share).toHaveBeenCalledWith({title:"My AudienceOwn Recovery Pass",url});vi.unstubAllGlobals()});
  it("falls back to copying when Web Share is unavailable",async()=>{const writeText=vi.fn().mockResolvedValue(undefined);vi.stubGlobal("navigator",{clipboard:{writeText}});await expect(shareRecoveryPassLink("https://audienceown.com/creator")).resolves.toBe("copied");expect(writeText).toHaveBeenCalledWith("https://audienceown.com/creator");vi.unstubAllGlobals()});
  it("keeps the projected Recovery Pass in its canonical card only",()=>{const source=readFileSync("components/dashboard/creator-command-dashboard.tsx","utf8");expect(source).not.toContain("<RecoveryPassShareButton");expect(source).toContain("<RecoveryPassCard recoveryPass={data.recoveryPass}")});
  it("uses responsive-safe URL and action styling",()=>{const source=readFileSync("components/dashboard/recovery-pass-card.tsx","utf8"),css=readFileSync("components/dashboard/recovery-pass-card.css","utf8");expect(source).toContain("overflow-hidden text-ellipsis whitespace-nowrap");expect(source).toContain('import "./recovery-pass-card.css"');expect(css).toContain(".recovery-pass-actions{position:relative");expect(css).toContain("flex-wrap:nowrap");expect(css).toContain("@media(max-width:700px)");expect(css).toContain("flex-wrap:wrap");expect(css).toContain("min-height:44px")});
});
