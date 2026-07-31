export function canDisplayVerifiedOfficial(input:{status:string;stableAccountId?:string|null;revokedAt?:string|null;expiredAt?:string|null;policyAllows:boolean}){
return input.status==="verified"&&Boolean(input.stableAccountId)&&!input.revokedAt&&!input.expiredAt&&input.policyAllows;}
