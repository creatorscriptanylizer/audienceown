import{describe,expect,it}from"vitest";
import{groupRecoveryAccounts}from"@/lib/recovery-network-grouping";

const kwamoon={id:"main-youtube",label:"KwaMoon"};
const instagram={id:"main-instagram",label:"Nana_friggy"};
const tiktok={id:"recovery-tiktok",label:"NPA"};
const discord={id:"recovery-discord",label:"Audienceown"};

describe("Recovery Network canonical grouping",()=>{
  it("places each Recovery only under its canonical Main ID",()=>{
    const grouped=groupRecoveryAccounts([kwamoon,instagram],[tiktok,discord],[
      {main_connected_account_id:kwamoon.id,recovery_connected_account_id:tiktok.id},
      {main_connected_account_id:instagram.id,recovery_connected_account_id:discord.id},
    ]);
    expect(grouped.linkedByMain.get(kwamoon.id)).toEqual([tiktok]);
    expect(grouped.linkedByMain.get(instagram.id)).toEqual([discord]);
    expect(grouped.unassigned).toEqual([]);
  });

  it("keeps a Recovery assigned until its exclusive relationship is removed",()=>{
    const oneRelation=groupRecoveryAccounts([kwamoon,instagram],[discord],[
      {main_connected_account_id:kwamoon.id,recovery_connected_account_id:discord.id},
    ]);
    expect(oneRelation.linkedByMain.get(instagram.id)).toEqual([]);
    expect(oneRelation.linkedByMain.get(kwamoon.id)).toEqual([discord]);
    expect(oneRelation.unassigned).toEqual([]);
    const noRelations=groupRecoveryAccounts([kwamoon,instagram],[discord],[]);
    expect(noRelations.linkedByMain.get(kwamoon.id)).toEqual([]);
    expect(noRelations.linkedByMain.get(instagram.id)).toEqual([]);
    expect(noRelations.unassigned).toEqual([discord]);
  });
});
