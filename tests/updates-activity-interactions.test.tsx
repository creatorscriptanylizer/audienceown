// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityItem } from "@/lib/updates-activity";

vi.mock("@/app/dashboard/updates/actions", () => ({
  deleteDraft: vi.fn(async () => ({})),
  cancelScheduledUpdate: vi.fn(async () => ({})),
}));

import { UpdatesActivityCommandCenter } from "@/components/updates-activity-command-center";

const base=(patch:Partial<ActivityItem>={}):ActivityItem=>({id:"update:one",canonicalUpdateId:"one",kind:"update",subtype:"new_video",occurredAt:"2026-08-16T16:15:00Z",platform:"youtube",accountDisplay:"KWA Moon",title:"Studio launch",description:"New video is live.",status:"draft",messagePreview:"Watch the studio launch.",recipientCount:null,recoveryDestinationSnapshot:null,detailHref:"/dashboard/updates/one",actionHref:null,managementPolicy:{canContinue:true,canDelete:true,canCancel:false,canReschedule:false,canRetry:false,canView:true,primaryAction:"CONTINUE_DRAFT"},insight:null,...patch});

describe("Updates & Activity interactions",()=>{
 let root:Root|null=null;
 beforeEach(()=>{(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;vi.stubGlobal("matchMedia",vi.fn(()=>({matches:true,media:"(prefers-reduced-motion: reduce)",onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()})));vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{callback(0);return 1})});
 afterEach(()=>{act(()=>root?.unmount());document.body.innerHTML=""});
 function render(items:ActivityItem[]){const node=document.createElement("div");document.body.append(node);root=createRoot(node);act(()=>root?.render(<UpdatesActivityCommandCenter items={items} attention={[]} generatedAt="2026-08-16T20:00:00Z"/>));return node}

 it("filters by category, platform, date, and creator-visible search fields",async()=>{const node=render([base(),base({id:"emergency",kind:"emergency",subtype:"account_inaccessible",status:"pending",platform:"instagram",description:"Recovery alert for Instagram",messagePreview:null,managementPolicy:{canContinue:false,canDelete:false,canCancel:false,canReschedule:false,canRetry:false,canView:true,primaryAction:"VIEW_DETAILS"}}),base({id:"old",occurredAt:"2026-01-01T00:00:00Z",description:"Historic Twitch update",platform:"twitch"})]);const tab=(name:string)=>[...node.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(button=>button.textContent===name)!;await act(async()=>tab("Emergency").click());expect(tab("Emergency").getAttribute("aria-selected")).toBe("true");expect(node.textContent).toContain("Recovery alert for Instagram");expect(node.textContent).not.toContain("New video is live.");await act(async()=>tab("All").click());const platform=node.querySelector<HTMLSelectElement>('select[aria-label="Filter by platform"]')!;await act(async()=>{platform.value="youtube";platform.dispatchEvent(new Event("change",{bubbles:true}))});expect(node.textContent).toContain("New video is live.");expect(node.textContent).not.toContain("Recovery alert for Instagram");await act(async()=>{platform.value="all";platform.dispatchEvent(new Event("change",{bubbles:true}))});const search=node.querySelector<HTMLInputElement>('input[placeholder="Search activity..."]')!;await act(async()=>{search.value="instagram";search.dispatchEvent(new Event("input",{bubbles:true}))});expect(node.textContent).toContain("Recovery alert for Instagram");expect(node.textContent).not.toContain("New video is live.");expect(node.textContent).not.toContain("Historic Twitch update")});

 it("opens the keyboard-accessible menu and traps/restores dialog focus",async()=>{const node=render([base()]),trigger=node.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;expect(trigger.getAttribute("aria-expanded")).toBe("false");await act(async()=>trigger.click());expect(trigger.getAttribute("aria-expanded")).toBe("true");const deleteItem=[...node.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(button=>button.textContent?.includes("Delete draft"))!;expect(document.activeElement).toBe(node.querySelector('[role="menuitem"]'));await act(async()=>deleteItem.click());const dialog=node.querySelector<HTMLElement>('[role="alertdialog"]')!;expect(dialog.textContent).toContain("Delete This Update?");const buttons=[...dialog.querySelectorAll<HTMLButtonElement>("button")];expect(document.activeElement).toBe(buttons[0]);act(()=>{buttons.at(-1)!.focus();document.dispatchEvent(new KeyboardEvent("keydown",{key:"Tab",bubbles:true}))});expect(document.activeElement).toBe(buttons[0]);await act(async()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));expect(node.querySelector('[role="alertdialog"]')).toBeNull();expect(document.activeElement).toBe(trigger)});

 it("uses singular and plural event-count grammar",()=>{const one=render([base()]);expect(one.textContent).toContain("1 event");act(()=>root?.unmount());root=null;document.body.innerHTML="";const two=render([base(),base({id:"two",canonicalUpdateId:"two"})]);expect(two.textContent).toContain("2 events")});
});
