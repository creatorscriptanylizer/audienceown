import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component=readFileSync(new URL("../components/plans-billing-workspace.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/dashboard/settings/plans/plans.css",import.meta.url),"utf8");

describe("subscription action-row layout contract",()=>{
  it("puts each heading and action together after its icon",()=>{
    expect(component).toContain('className="subscription-action-copy"><h3>');
    expect(component).toMatch(/<CreditCard aria-hidden\/><\/span><div className="subscription-action-copy"><h3>[\s\S]*?<SafeBillingAction[\s\S]*?<\/div><\/article>/);
    expect(component).toMatch(/<Trash2 aria-hidden\/><\/span><div className="subscription-action-copy"><h3>Cancel subscription<\/h3><button[\s\S]*?<\/div><\/article>/);
  });
  it("uses the approved minmax-safe two-column card grid",()=>{
    expect(css).toContain("grid-template-columns:76px minmax(0,1fr)");
    expect(css).toContain(".subscription-action-copy{grid-column:2;grid-row:1;display:block;min-width:0");
    expect(css).toContain("white-space:nowrap");
    expect(css).not.toMatch(/subscription-actions[^}]*position:absolute/);
  });
  it("stacks the outer panel on tablet and actions on mobile",()=>{
    expect(css).toContain("@media(max-width:980px){.plans-subscription{grid-template-columns:1fr");
    expect(css).toContain("@media(max-width:760px){.plans-subscription{gap:24px");
    expect(css).toContain(".subscription-action-copy .button{width:100%;min-width:0;min-height:48px");
  });
  it("removes both obsolete action-card descriptions",()=>{expect(component).not.toContain("View invoices, update your payment method, and manage your billing details.");expect(component).not.toContain("End your paid subscription. We&apos;ll show you exactly what changes before anything is confirmed.");});
});
