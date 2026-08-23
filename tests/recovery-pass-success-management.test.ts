import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Recovery Pass success management", () => {
  it("reloads the persisted member state from Stage 6", () => {
    const source = readFileSync("components/recovery-pass-flow.tsx", "utf8");

    expect(source).toContain('className="rp-manage-action" type="button" onClick={onManage}');
    expect(source).toContain('onManage={()=>location.reload()}');
    expect(source).not.toContain(
      '<button type="button" onClick={() => setStage(4)}>Manage my preferences</button>',
    );
  });
});
