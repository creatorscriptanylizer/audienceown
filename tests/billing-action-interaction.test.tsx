// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BillingAction } from "@/components/billing-action";

let root:Root|undefined;
afterEach(async()=>{await act(async()=>root?.unmount());document.body.innerHTML="";vi.restoreAllMocks();root=undefined;});

describe("BillingAction",()=>{
  it("shows a non-duplicating portal loading state and a retryable card-level error",async()=>{
    let complete!:(value:Response)=>void;
    vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));
    const node=document.createElement("div");document.body.append(node);root=createRoot(node);
    await act(async()=>root?.render(<BillingAction kind="portal" pendingLabel="Opening billing…" errorMessage="We couldn't open billing right now. Please try again.">Manage billing →</BillingAction>));
    const button=node.querySelector("button")!;
    await act(async()=>button.click());
    expect(button.textContent).toBe("Opening billing…");expect(button.disabled).toBe(true);
    await act(async()=>complete(new Response(JSON.stringify({error:"billing_unavailable"}),{status:502,headers:{"content-type":"application/json"}})));
    expect(node.textContent).toContain("We couldn't open billing right now. Please try again.");expect(button.disabled).toBe(false);
  });
});
