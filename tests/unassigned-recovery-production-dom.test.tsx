// @vitest-environment jsdom

import{act}from"react";
import{createRoot,type Root}from"react-dom/client";
import{afterEach,describe,expect,it,vi}from"vitest";

vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("@/app/actions/persistent-recovery-network",()=>({savePersistentRecoveryNetwork:vi.fn()}));
vi.mock("@/app/actions/creator",()=>({removeMainAccount:vi.fn()}));
vi.mock("@/app/actions/recovery-account",()=>({removeRecoveryAccount:vi.fn()}));

import{RecoveryNetworksPage}from"@/components/recovery-networks-page";
import type{PlatformAccount}from"@/components/platforms-manager";

(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:Root|undefined;
afterEach(async()=>{await act(async()=>root?.unmount());document.body.innerHTML="";root=undefined;});

const account=(id:string,label:string,accountType:"official"|"backup",position:number):PlatformAccount=>({id,platform:"youtube",account_type:accountType,label,url:`https://youtube.com/@${id}`,is_primary:accountType==="official",is_public:true,position,connection_health:"healthy",provider_status:"connected",external_account_id:id});

describe("production Unassigned Recovery Accounts DOM contract",()=>{
  it("renders one closed-row trigger and ten options only after opening",async()=>{
    const mains=Array.from({length:10},(_,index)=>account(`main-${index}`,index===0?"KwaMoon":index===1?"WatchBoost":`Main ${index+1}`,"official",index));
    const recovery=account("lineconomy","Lineconomy","backup",10);
    const networks=mains.map((main,index)=>({id:`network-${index}`,main_connected_account_id:main.id,position:index,recovery_account_ids:[]}));
    const container=document.createElement("div");document.body.append(container);root=createRoot(container);
    await act(async()=>root?.render(<RecoveryNetworksPage accounts={[...mains,recovery]} networks={networks} onConfigure={vi.fn()}/>));
    const rows=[...container.querySelectorAll("article")].filter(row=>row.textContent?.includes("Lineconomy")&&row.textContent?.includes("Recovery Account"));
    expect(rows).toHaveLength(1);
    const row=rows[0];
    expect([...row.querySelectorAll("button")].filter(button=>button.textContent?.includes("Assign to Network"))).toHaveLength(1);
    expect(row.querySelectorAll('button[aria-label="More actions for Lineconomy"]')).toHaveLength(1);
    expect(row.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
    expect([...row.querySelectorAll("button")].filter(button=>/Delete|Remove Connection/.test(button.textContent??""))).toHaveLength(0);
    const trigger=[...row.querySelectorAll("button")].find(button=>button.textContent?.includes("Assign to Network"))!;
    await act(async()=>trigger.click());
    expect([...row.querySelectorAll("button")].filter(button=>button.textContent?.includes("Assign to Network"))).toHaveLength(1);
    expect(row.querySelectorAll('[role="menuitem"]')).toHaveLength(10);
    expect(row.querySelectorAll('button[aria-label="More actions for Lineconomy"]')).toHaveLength(1);
    expect(row.textContent).toContain("KwaMoon");expect(row.textContent).toContain("WatchBoost");
  });
});
