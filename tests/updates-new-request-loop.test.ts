import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CREATE_EMERGENCY_ENTRY_ROUTE, CREATE_UPDATE_ENTRY_ROUTE, CREATE_UPDATE_ROUTE } from "@/lib/dashboard-routes";

const source=(path:string)=>readFileSync(path,"utf8");
const entryPoints=[
  "components/updates-activity-command-center.tsx",
  "components/dashboard/creator-command-dashboard.tsx",
  "components/emergency-workspace.tsx",
];

describe("Create Update request-loop regression",()=>{
 it("disables automatic prefetch for every expensive Create Update entry point",()=>{
  for(const path of entryPoints){
   const content=source(path),links=[...content.matchAll(/<Link\b[^>]*href=(?:"\/dashboard\/updates\/new"|\{CREATE_(?:UPDATE|EMERGENCY)_ENTRY_ROUTE\})[^>]*>/g)].map(match=>match[0]);
   expect(links.length,`${path} should keep its Create Update links`).toBeGreaterThan(0);
   for(const link of links)expect(link,`${path} must not automatically prefetch the authenticated editor route`).toContain("prefetch={false}");
  }
 });
 it("keeps the page free of navigation, refresh, reload, and recursive-fetch effects",()=>{
  const route=source("app/dashboard/updates/new/page.tsx"),studio=source("components/broadcast-studio/broadcast-studio.tsx");
  for(const forbidden of ["router.refresh", "router.push", "router.replace", "location.reload", 'fetch("/dashboard/updates/new'])expect(`${route}\n${studio}`).not.toContain(forbidden);
 });
 it("routes both Updates & Activity header actions to the navigation-only creation hub",()=>{
  const commandCenter=source("components/updates-activity-command-center.tsx"),header=commandCenter.slice(commandCenter.indexOf('<header className="activity-header">'),commandCenter.indexOf("</header>"));
  expect(header).toContain("href={CREATE_UPDATE_ENTRY_ROUTE}");
  expect(header).toContain("href={CREATE_EMERGENCY_ENTRY_ROUTE}");
  expect(header).toContain("Create Update");
  expect(header).toContain("Send Emergency Alert");
  expect(header).not.toContain("/dashboard/emergency");
  expect(header).not.toContain("onClick=");
 });
 it("uses one canonical, side-effect-free route for every audited emergency communication entry",()=>{
  expect(CREATE_UPDATE_ROUTE).toBe("/dashboard/updates/new");
  expect(CREATE_UPDATE_ENTRY_ROUTE).toBe("/dashboard/updates/new?intent=update");
  expect(CREATE_EMERGENCY_ENTRY_ROUTE).toBe("/dashboard/updates/new?intent=emergency");
  const updates=source("components/updates-activity-command-center.tsx"),emergency=source("components/emergency-workspace.tsx"),dashboard=source("components/dashboard/creator-command-dashboard.tsx");
  const emergencyEntries=[...updates.matchAll(/Send Emergency Alert/g)].map(match=>match.index);
  expect(emergencyEntries).toHaveLength(3);
  for(const index of emergencyEntries) {
   const link=updates.slice(updates.lastIndexOf("<Link",index),updates.indexOf("</Link>",index));
   expect(link).toContain("href={CREATE_EMERGENCY_ENTRY_ROUTE}");
   expect(link).toContain("prefetch={false}");
   expect(link).not.toContain("onClick");
  }
  const emergencyCta=emergency.slice(emergency.lastIndexOf("<Link",emergency.indexOf("Create emergency update")),emergency.indexOf("</Link>",emergency.indexOf("Create emergency update")));
  expect(emergencyCta).toContain("href={CREATE_EMERGENCY_ENTRY_ROUTE}");
  expect(emergencyCta).not.toContain("?type=account_update");
  expect(dashboard.slice(0,dashboard.indexOf("View History"))).toContain("href={CREATE_UPDATE_ENTRY_ROUTE}");
 });
 it("preserves monitoring, history, detail, and account-management destinations",()=>{
  const updates=source("components/updates-activity-command-center.tsx"),navigation=source("lib/dashboard-navigation.ts"),analytics=source("components/recovery/live-recovery-analytics.tsx"),accounts=source("components/connected-platform-card.tsx");
  expect(navigation).not.toContain('{ href: "/dashboard/emergency", label: "Emergency"');
  expect(analytics).toContain('href="/dashboard/emergency">Open Emergency Center');
  expect(updates).toContain("item.detailHref");
  expect(updates).toContain('href="/dashboard/platforms"');
  expect(accounts).toContain("Reconnect YouTube");
  expect(accounts).toContain('href="/dashboard/platforms"');
 });
 it("preserves authenticated creator scoping and the complete selector",()=>{
  const route=source("app/dashboard/updates/new/page.tsx"),choices=source("components/broadcast-studio/broadcast-choices.ts");
  expect(route).toContain("requireCreator()");
  expect(route).toContain('.eq("creator_id", creator.id)');
  for(const label of ["New video","Livestream","Podcast episode","Product release","Event","General announcement","Community update","Account inaccessible","Platform migration"])expect(choices).toContain(`title: "${label}"`);
 });
 it("does not accept client-provided kind as classification authority",()=>{const actions=source("app/dashboard/updates/actions.ts");expect(actions).toContain("classifyBroadcastIntent(intent)");expect(actions).not.toMatch(/data\.get\(["']kind["']\)/);expect(actions).not.toMatch(/data\.get\(["']broadcast_type["']\)/)});
});
