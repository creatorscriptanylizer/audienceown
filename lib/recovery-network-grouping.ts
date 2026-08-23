export type RecoveryNetworkRelationship={
  main_connected_account_id:string;
  recovery_connected_account_id:string;
};

export function groupRecoveryAccounts<T extends {id:string}>(
  mains:T[],
  recoveries:T[],
  relationships:RecoveryNetworkRelationship[],
){
  const recoveryById=new Map(recoveries.map(account=>[account.id,account]));
  const linkedByMain=new Map(mains.map(main=>[
    main.id,
    relationships
      .filter(link=>link.main_connected_account_id===main.id)
      .map(link=>recoveryById.get(link.recovery_connected_account_id))
      .filter((account):account is T=>Boolean(account)),
  ]));
  const assignedRecoveryIds=new Set(relationships.map(link=>link.recovery_connected_account_id));
  return{linkedByMain,unassigned:recoveries.filter(account=>!assignedRecoveryIds.has(account.id))};
}
