import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stageSixCompletionState } from "@/components/recovery-pass-flow";

const flow = readFileSync("components/recovery-pass-flow.tsx", "utf8");
const styles = readFileSync("components/recovery-pass-flow.css", "utf8");

describe("Recovery Pass Stage 6 completion", () => {
  it("uses the full guidance grid and renders selected accounts only", () => {
    expect(flow).toContain("rp-stage-six-guidance");
    expect(flow).toContain("chosen.map(account");
    expect(styles).toContain("grid-template-columns:24px minmax(0,1fr)");
    expect(styles).toContain(".rp-stage-six-guidance p{min-width:0;width:100%");
  });

  it("persists truthful visited state and gates Done on every selected account", () => {
    expect(flow).toContain("visited?: string[]");
    expect(flow).toContain("selected, preferences, visited, tokens");
    expect(flow).toContain("selectedAccountCount>0&&visitedAccountCount===selectedAccountCount");
    expect(flow).toContain('disabled={!allVisited}');
    expect(flow).toContain('wasVisited?"Visited":"Not opened yet"');
    expect(flow).not.toContain('wasVisited?"Followed"');
    expect(flow).not.toContain('wasVisited?"Subscribed"');
  });

  it.each([[0,false],[3,false],[4,false],[5,true]] as const)("keeps completion locked at %i of 5 visits",(count,expected)=>{const selected=["a","b","c","d","e"],visited=selected.slice(0,count);expect(stageSixCompletionState(selected,visited)).toEqual({selectedAccountCount:5,visitedAccountCount:count,allVisited:expected});});

  it("locks completion-only actions with native disabled semantics and keeps management available",()=>{expect(flow).toContain('className="rp-manage-action" type="button" onClick={onManage}');expect(flow).toContain('className="rp-identity-action is-locked" type="button" disabled aria-disabled="true"');expect(flow).toContain('Visit every selected account to unlock your final actions.');expect(flow).toContain('Your safety network is ready.');expect(flow).toContain('href={`/verify/${creatorHandle}`} target="_blank" rel="noopener noreferrer"');});

  it("keeps verified identity separate and transitions Done to celebration", () => {
    expect(flow).toContain('target="_blank" rel="noopener noreferrer"');
    expect(flow).toContain("setCelebrating(true)");
    expect(flow).toContain("Recovery Pass complete");
    expect(flow).toContain("You&apos;re connected to {name}.");
    expect(flow).toContain("You&apos;re all set.");
    expect(flow).toContain("Your connection to {name} is protected. You can safely close this page whenever you&apos;re ready.");
  });

  it("orbits only selected provider icons and respects reduced motion", () => {
    expect(flow).toContain("chosen.map((account, index)");
    expect(flow).toContain("rp-orbit-shield");
    expect(styles).toContain("@keyframes rp-orbit-node");
    expect(styles).toContain("@media(prefers-reduced-motion:reduce)");
    expect(styles).toContain(".rp-orbit-node,.rp-orbit-shield,.rp-visit-progress>i>b{animation:none");
  });
});
