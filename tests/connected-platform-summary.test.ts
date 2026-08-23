import{readFileSync}from"node:fs";
import{describe,expect,it}from"vitest";

const component=readFileSync("components/platforms-manager.tsx","utf8"),css=readFileSync("app/globals.css","utf8");

describe("elite connected-account summary",()=>{
  it("renders canonical Main and Recovery accounts with native provider identity",()=>{
    expect(component).toContain('savedOfficials.map(account=>');
    expect(component).toContain('savedBackups.map(account=>');
    expect(component).toContain('<PlatformBrandIcon provider={provider.id} label={provider.name} size="sm"/>');
    expect(component).toContain('${provider.name} · ${account.label} — Main account');
    expect(component).toContain('${provider.name} · ${account.label} — Recovery account');
  });

  it("shows canonical totals and a real aggregate health state",()=>{
    expect(component).toContain('{savedOfficials.length}');
    expect(component).toContain('{savedBackups.length}');
    expect(component).toContain('const attentionCount=canonicalDrafts.filter');
    expect(component).toContain('attentionCount?`${attentionCount}');
    expect(component).toContain('"All connected"');
  });

  it("keeps Manage accounts functional and accessible",()=>{
    expect(component).toContain('aria-labelledby="connected-platforms-title"');
    expect(component).toContain('className="button button-secondary connected-manage-accounts" onClick={e=>openModal(e.currentTarget)}');
    expect(component).toContain('role="status"');
    expect(component).toContain('title={`${provider.name} · ${account.label} — Main account`}');
  });

  it("uses responsive role blocks without technical provider diagnostics",()=>{
    for(const contract of [".connected-account-summary","grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr)",".connected-role-group.is-recovery","@media(max-width:900px)","@media(max-width:699px)","@media(prefers-reduced-motion:reduce)"])expect(css).toContain(contract);
    for(const term of ["OAuth","API access","polling","webhook","scope","last sync"])expect(component.slice(component.indexOf('<section className="connected-platforms"'),component.indexOf("{open&&"))).not.toContain(term);
  });
});
